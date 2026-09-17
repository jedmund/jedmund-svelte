import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

// Keep unrelated pre-existing diagnostics visible without accepting new errors.
const baseline = JSON.parse(readFileSync('tests/fixtures/typecheck-baseline.json', 'utf8')) as {
	ref: string
	errors: { file: string; message: string }[]
}
const sync = spawnSync('./node_modules/.bin/svelte-kit', ['sync'], { stdio: 'inherit' })
assert.equal(sync.status, 0, 'SvelteKit sync failed')
const result = spawnSync(
	'./node_modules/.bin/svelte-check',
	['--tsconfig', './tsconfig.json', '--output', 'machine'],
	{ encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }
)
const output = result.stdout ?? ''
const errors = output.split('\n').flatMap((line) => {
	const match = line.match(/ ERROR (".*?") \d+:\d+ (".*")$/)
	return match ? [{ file: JSON.parse(match[1]!), message: JSON.parse(match[2]!) }] : []
})
const completed = output.match(/COMPLETED \d+ FILES (\d+) ERRORS/)
assert.ok(completed, `svelte-check did not complete: ${result.stderr}`)
assert.equal(errors.length, Number(completed[1]), 'Could not parse every diagnostic')
assert.ok(result.status === 0 || result.status === 1, 'svelte-check failed unexpectedly')
const allowed = baseline.errors.map((error) => JSON.stringify(error))
const introduced = errors.filter((error) => {
	if (/^src\/lib\/(components\/(edra|admin\/composer)|editor)\//.test(error.file)) return true
	const index = allowed.indexOf(JSON.stringify(error))
	if (index < 0) return true
	allowed.splice(index, 1)
	return false
})
if (introduced.length) {
	console.error(introduced)
	throw new Error(`${introduced.length} new or migration-owned type errors`)
}
console.log(
	`Type gate: ${errors.length} existing errors; no new or migration-owned errors (baseline ${baseline.ref})`
)
