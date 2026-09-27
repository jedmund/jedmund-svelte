import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
let failed = false

// Report both checks even when the first fails. Use the installed versions on every platform.
for (const [name, entry, args] of [
	['eslint', 'bin/eslint.js', ['.']],
	['prettier', 'bin/prettier.cjs', ['--check', '.']]
] as const) {
	console.log(`\n${name}`)
	const binary = join(dirname(require.resolve(`${name}/package.json`)), entry)
	const result = spawnSync(process.execPath, [binary, ...args], {
		stdio: 'inherit'
	})
	if (result.error) console.error(result.error)
	failed ||= result.status !== 0
}
process.exitCode = failed ? 1 : 0
