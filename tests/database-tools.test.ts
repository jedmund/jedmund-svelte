import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, writeFile, rm, stat, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
	assertDifferent,
	backup,
	connection,
	databaseExists,
	identifier,
	loadEnvironment,
	pg,
	redact,
	requireLocal,
	restore,
	sql
} from '../scripts/lib/database.ts'

test('parses encoded credentials and preserves SSL without leaking passwords', () => {
	const config = connection(
		'postgresql://user:p%40ss%3Aword@example.com:5433/db?sslmode=require&schema=public'
	)
	assert.equal(config.password, 'p@ss:word')
	assert.equal(config.url.password, '')
	assert.equal(config.url.searchParams.get('sslmode'), 'require')
	assert.equal(config.url.searchParams.has('schema'), false)
	assert.throws(() => connection('broken'), /Invalid database URL/)
	assert.throws(() => requireLocal(config.url.toString()), /loopback/)
	assert.throws(() => requireLocal('postgres://u@localhost/db?host=production.example'), /routing/)
	assert.throws(
		() => assertDifferent('postgres://u@localhost/db', 'postgres://u@127.0.0.1:5432/db'),
		/must differ/
	)
	assert.doesNotMatch(redact('postgres://user:secret@host/db secret', ['secret']), /secret/)
	assert.equal(identifier('a"b'), '"a""b"')
})

test('environment uses process > explicit file > local > base without shell evaluation', async () => {
	const directory = await mkdtemp(join(tmpdir(), 'edra-env-'))
	try {
		await writeFile(join(directory, '.env'), 'A=base\nB=base\nC=$(echo secret)')
		await writeFile(join(directory, '.env.local'), 'A=local\nB=local')
		await writeFile(join(directory, 'test.env'), 'A=explicit')
		assert.deepEqual(loadEnvironment('test.env', { B: 'process' }, directory), {
			A: 'explicit',
			B: 'process',
			C: '$(echo secret)'
		})
	} finally {
		await rm(directory, { recursive: true, force: true })
	}
})

test('failed dump leaves no successful backup and redacts connection errors', async () => {
	const directory = await mkdtemp(join(tmpdir(), 'edra-failed-dump-'))
	try {
		await assert.rejects(
			backup(
				'postgres://user:private-password@127.0.0.1:1/no_database?connect_timeout=1',
				directory
			),
			(error: Error) => {
				assert.doesNotMatch(error.message, /private-password/)
				return true
			}
		)
		assert.deepEqual(await readdir(directory), [])
	} finally {
		await rm(directory, { recursive: true, force: true })
	}
})

test(
	'dump and restore preserve data, reject existing targets, and fail atomically',
	{ skip: !process.env.TEST_DATABASE_URL },
	async () => {
		const base = process.env.TEST_DATABASE_URL!
		requireLocal(base)
		const source = new URL(base),
			target = new URL(base),
			broken = new URL(base)
		const prefix = `jedmund_edra_test_${process.pid}_${Date.now()}`
		source.pathname = `/${prefix}_source`
		target.pathname = `/${prefix}_target`
		broken.pathname = `/${prefix}_broken`
		const directory = await mkdtemp(join(tmpdir(), 'edra-db-'))
		try {
			sql(
				source.toString(),
				`CREATE DATABASE ${identifier(connection(source.toString()).name)}`,
				true
			)
			sql(
				source.toString(),
				'CREATE TABLE sample (id integer PRIMARY KEY, content jsonb); INSERT INTO sample VALUES (1, \'{"type":"doc","content":[]}\');'
			)
			const file = await backup(source.toString(), directory, 'synthetic')
			assert.equal((await stat(file)).mode & 0o777, 0o600)
			await restore(file, target.toString())
			assert.equal(
				sql(target.toString(), 'SELECT content FROM sample'),
				sql(source.toString(), 'SELECT content FROM sample')
			)
			await assert.rejects(restore(file, target.toString()), /already exists/)
			const invalid = join(directory, 'broken.sql')
			await writeFile(invalid, 'CREATE TABLE partial (id integer); SELECT nonexistent_function();')
			await assert.rejects(restore(invalid, broken.toString()), /psql failed/)
			assert.equal(
				sql(
					broken.toString(),
					"SELECT count(*) FROM information_schema.tables WHERE table_name = 'partial'"
				),
				'0'
			)
			const corrupt = join(directory, 'corrupt.sql.gz')
			await writeFile(corrupt, 'not gzip')
			await assert.rejects(restore(corrupt, target.toString(), true))
			assert.equal(sql(target.toString(), 'SELECT count(*) FROM sample'), '1')
		} finally {
			for (const url of [source, target, broken])
				if (databaseExists(url.toString()))
					sql(url.toString(), `DROP DATABASE ${identifier(connection(url.toString()).name)}`, true)
			await rm(directory, { recursive: true, force: true })
		}
	}
)
