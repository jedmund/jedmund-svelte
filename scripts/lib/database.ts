import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, createReadStream, createWriteStream } from 'node:fs'
import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { createGzip, createGunzip } from 'node:zlib'
import { parse } from 'dotenv'

export function loadEnvironment(file?: string, inherited = process.env, directory = process.cwd()) {
	const result: NodeJS.ProcessEnv = {}
	for (const name of ['.env', '.env.local', ...(file ? [file] : [])]) {
		const path = resolve(directory, name)
		if (file === name && !existsSync(path)) throw new Error('Environment file does not exist')
		if (existsSync(path)) Object.assign(result, parse(readFileSync(path)))
	}
	return Object.assign(result, inherited)
}

export function connection(value: string | undefined) {
	if (!value) throw new Error('Database URL is not configured')
	let url: URL
	try {
		url = new URL(value)
	} catch {
		throw new Error('Invalid database URL')
	}
	if (!['postgres:', 'postgresql:'].includes(url.protocol))
		throw new Error('Expected a PostgreSQL URL')
	if (!url.hostname || !url.pathname.slice(1))
		throw new Error('Database host and name are required')
	for (const key of [
		'host',
		'hostaddr',
		'port',
		'dbname',
		'user',
		'password',
		'service',
		'servicefile'
	]) {
		if (url.searchParams.has(key))
			throw new Error(
				'Database routing must be specified in the URL authority/path, not query parameters'
			)
	}
	const name = decodeURIComponent(url.pathname.slice(1))
	const password = decodeURIComponent(url.password)
	for (const key of ['schema', 'connection_limit', 'pool_timeout', 'pgbouncer'])
		url.searchParams.delete(key)
	url.password = ''
	return { url, name, password, local: ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) }
}

export function requireLocal(value: string | undefined) {
	const target = connection(value)
	if (!target.local) throw new Error('Local operations require a loopback database host')
	return target
}

export function redact(message: string, secrets: string[] = []) {
	let result = message.replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, '[database URL]')
	for (const secret of secrets.filter(Boolean)) result = result.split(secret).join('[redacted]')
	return result
}

export function pg(
	tool: string,
	args: string[],
	value: string,
	options: { input?: string; maintenance?: boolean } = {}
) {
	const config = connection(value)
	if (options.maintenance) config.url.pathname = '/postgres'
	const env = Object.fromEntries(
		Object.entries(process.env).filter(([key]) => !key.startsWith('PG'))
	)
	const result = spawnSync(tool, [...args, '--dbname', config.url.toString()], {
		env: { ...env, PGPASSWORD: config.password },
		input: options.input,
		encoding: 'utf8',
		maxBuffer: 16 * 1024 * 1024
	})
	if (result.error || result.status !== 0)
		throw new Error(
			redact(`${tool} failed: ${result.error?.message ?? result.stderr}`, [
				config.password,
				encodeURIComponent(config.password)
			])
		)
	return result.stdout.trim()
}

export const identifier = (value: string) => `"${value.replaceAll('"', '""')}"`
export const sql = (value: string, statement: string, maintenance = false) =>
	pg('psql', ['-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', statement], value, { maintenance })

export function databaseExists(value: string) {
	const { name } = connection(value)
	return (
		pg('psql', ['-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-v', `target=${name}`], value, {
			maintenance: true,
			input: "SELECT count(*) FROM pg_database WHERE datname = :'target';\n"
		}) === '1'
	)
}

export function assertDifferent(source: string, target: string) {
	const a = connection(source),
		b = requireLocal(target)
	const host = (c: typeof a) => (c.local ? 'loopback' : c.url.hostname)
	if (host(a) === host(b) && (a.url.port || '5432') === (b.url.port || '5432') && a.name === b.name)
		throw new Error('Source and destination databases must differ')
}

export function preflight(source: string, target?: string) {
	const sourceMajor = Math.floor(Number(sql(source, 'SHOW server_version_num')) / 10000)
	const result = spawnSync('pg_dump', ['--version'], { encoding: 'utf8' })
	const dumpMajor = Number(result.stdout?.match(/PostgreSQL\) (\d+)/)?.[1])
	if (!dumpMajor || result.status !== 0) throw new Error('pg_dump is unavailable')
	if (dumpMajor < sourceMajor)
		throw new Error('pg_dump must be at least the production server major version')
	if (target) {
		requireLocal(target)
		const localMajor = Math.floor(Number(sql(target, 'SHOW server_version_num', true)) / 10000)
		if (localMajor < dumpMajor)
			throw new Error(`Local PostgreSQL must be version ${dumpMajor} or newer for this dump client`)
	}
}

export async function backup(value: string, directory = 'backups', prefix = 'remote') {
	await mkdir(directory, { recursive: true, mode: 0o700 })
	const stamp = new Date()
		.toISOString()
		.replace('T', '_')
		.replace(/[-:.Z]/g, '')
	const path = resolve(directory, `${prefix}_${stamp}_${process.pid}.sql.gz`)
	const temporary = `${path}.partial.sql`
	try {
		await writeFile(temporary, '', { mode: 0o600, flag: 'wx' })
		pg('pg_dump', ['--no-owner', '--no-acl', '--no-tablespaces', '--file', temporary], value)
		await pipeline(
			createReadStream(temporary),
			createGzip(),
			createWriteStream(`${path}.partial`, { mode: 0o600, flags: 'wx' })
		)
		await rename(`${path}.partial`, path)
		return path
	} finally {
		await rm(temporary, { force: true })
		await rm(`${path}.partial`, { force: true })
	}
}

export async function restore(path: string, target: string, replace = false) {
	if (!existsSync(path)) throw new Error('Backup file does not exist')
	const config = connection(target)
	const temporary = resolve('backups', `.restore-${process.pid}-${Date.now()}.sql`)
	await mkdir('backups', { recursive: true, mode: 0o700 })
	try {
		if (path.endsWith('.gz'))
			await pipeline(
				createReadStream(path),
				createGunzip(),
				createWriteStream(temporary, { mode: 0o600, flags: 'wx' })
			)
		const exists = databaseExists(target)
		if (exists && !replace)
			throw new Error('Destination already exists; choose a new test database')
		if (exists) sql(target, `DROP DATABASE ${identifier(config.name)} WITH (FORCE)`, true)
		sql(target, `CREATE DATABASE ${identifier(config.name)}`, true)
		pg(
			'psql',
			[
				'-X',
				'-v',
				'ON_ERROR_STOP=1',
				'--single-transaction',
				'--file',
				path.endsWith('.gz') ? temporary : resolve(path)
			],
			target
		)
	} finally {
		await rm(temporary, { force: true })
	}
}
