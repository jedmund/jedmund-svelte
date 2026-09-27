import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
	baselineAt,
	checkSizes,
	inventory,
	parseBaseline,
	physicalLines,
	sizeLimit,
	sourceFiles
} from '../scripts/quality/structure.ts'

const lines = (count: number) => '// comment\n'.repeat(count)
const empty = { fileSizes: {} }

test('physical lines include comments and blanks without a phantom trailing line', () => {
	assert.equal(physicalLines(''), 0)
	assert.equal(physicalLines('a\r\n\r\n'), 2)
	assert.equal(physicalLines('a\n\n// comment'), 3)
})

test('production limits include application editor and Svelte state modules', () => {
	assert.equal(sizeLimit('src/lib/editor/jedmund/Node.svelte'), 300)
	assert.equal(sizeLimit('src/lib/state.svelte.ts'), 500)
	assert.equal(sizeLimit('src/routes/api/admin/settings/test/+server.ts'), 500)
	for (const path of [
		'src/lib/components/edra/Node.svelte',
		'src/stories/Example.svelte',
		'src/lib/a.stories.ts',
		'src/lib/a.test.ts',
		'src/lib/fixtures/a.ts',
		'scripts/a.ts',
		'.svelte-kit/generated.ts',
		'prisma/migrations/a.ts'
	]) {
		assert.equal(sizeLimit(path), null, path)
	}
})

test('new files pass exactly at the limits and fail one line above', () => {
	for (const [file, limit] of [
		['src/A.svelte', 300],
		['src/a.ts', 500],
		['src/a.scss', 500]
	] as const) {
		assert.deepEqual(checkSizes(new Map([[file, lines(limit)]]), empty, empty), [])
		assert.equal(checkSizes(new Map([[file, lines(limit + 1)]]), empty, empty).length, 1)
	}
})

test('allowances cannot grow and must shrink or disappear with their files', () => {
	const previous = { fileSizes: { 'src/A.svelte': 400 } }
	const files = new Map([['src/A.svelte', lines(350)]])
	assert.match(checkSizes(files, previous, previous).join(), /actual 350/)
	assert.deepEqual(checkSizes(files, inventory(files), previous), [])
	assert.match(checkSizes(new Map(), previous, previous).join(), /remove the baseline/)
	assert.match(
		checkSizes(
			new Map([['src/A.svelte', lines(401)]]),
			{ fileSizes: { 'src/A.svelte': 401 } },
			previous
		).join(),
		/increased/
	)
	assert.match(checkSizes(files, inventory(files), empty).join(), /new or increased/)
	assert.deepEqual(checkSizes(new Map([['src/A.svelte', lines(300)]]), empty, previous), [])
	assert.throws(() => parseBaseline('{"fileSizes":{"src/A.svelte":300}}'), /Invalid/)
	assert.throws(
		() => parseBaseline('{"fileSizes":{},"sizeExclusions":["src/A.svelte"]}'),
		/Invalid/
	)
})

test('initial adoption uses target files; later checks use its baseline and include untracked sources', () => {
	const root = mkdtempSync(join(tmpdir(), 'structure-test-'))
	const git = (...args: string[]) => execFileSync('git', args, { cwd: root, stdio: 'pipe' })
	try {
		git('init')
		mkdirSync(join(root, 'src'))
		writeFileSync(join(root, 'src/A.svelte'), lines(400))
		git('add', '.')
		git(
			'-c',
			'user.name=Test',
			'-c',
			'user.email=test@example.invalid',
			'-c',
			'commit.gpgsign=false',
			'commit',
			'-m',
			'Initial fixture'
		)
		assert.deepEqual(baselineAt(root, 'HEAD'), { fileSizes: { 'src/A.svelte': 400 } })
		writeFileSync(join(root, 'src/New.svelte'), lines(301))
		assert.ok(sourceFiles(root).has('src/New.svelte'))
		writeFileSync(
			join(root, 'quality-baseline.json'),
			JSON.stringify({ fileSizes: { 'src/A.svelte': 350 } })
		)
		git('add', 'quality-baseline.json')
		git(
			'-c',
			'user.name=Test',
			'-c',
			'user.email=test@example.invalid',
			'-c',
			'commit.gpgsign=false',
			'commit',
			'-m',
			'Baseline fixture'
		)
		assert.equal(baselineAt(root, 'HEAD').fileSizes['src/A.svelte'], 350)
		assert.throws(() => baselineAt(root, 'missing-target'), /Cannot resolve quality base/)
	} finally {
		rmSync(root, { recursive: true, force: true })
	}
})
