import { readFileSync } from 'node:fs'
import { baselineAt, checkSizes, parseBaseline, sourceFiles } from './quality/structure.ts'

try {
	const root = process.cwd()
	const baseline = parseBaseline(readFileSync('quality-baseline.json', 'utf8'))
	const previous = baselineAt(root, process.env.QUALITY_BASE_REF || 'origin/main')
	const problems = checkSizes(sourceFiles(root), baseline, previous)
	if (problems.length) {
		console.error(problems.join('\n'))
		process.exitCode = 1
	} else {
		console.log(
			`File-size checks passed (${Object.keys(baseline.fileSizes).length} shrinking allowances).`
		)
	}
} catch (error) {
	console.error(error instanceof Error ? error.message : error)
	process.exitCode = 1
}
