import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

export interface Baseline {
	fileSizes: Record<string, number>
}

export function physicalLines(source: string): number {
	return source === '' ? 0 : source.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n').length
}

export function sizeLimit(file: string): number | null {
	if (
		!file.startsWith('src/') ||
		file.startsWith('src/lib/components/edra/') ||
		file.startsWith('src/stories/') ||
		/(?:^|\/)(?:__fixtures__|fixtures|__tests__|testing)\//.test(file) ||
		/\.(?:stories|test|spec|testSupport)\./.test(file)
	)
		return null
	if (file.endsWith('.svelte')) return 300
	return /\.(?:[cm]?js|ts|css|scss)$/.test(file) ? 500 : null
}

export function inventory(files: Map<string, string>): Baseline {
	return {
		fileSizes: Object.fromEntries(
			[...files].flatMap(([file, source]) => {
				const limit = sizeLimit(file)
				const count = physicalLines(source)
				return limit !== null && count > limit ? [[file, count]] : []
			})
		)
	}
}

export function parseBaseline(source: string): Baseline {
	const value: unknown = JSON.parse(source)
	if (
		!value ||
		typeof value !== 'object' ||
		!('fileSizes' in value) ||
		!value.fileSizes ||
		typeof value.fileSizes !== 'object' ||
		Array.isArray(value.fileSizes) ||
		Object.keys(value).some((key) => key !== 'fileSizes') ||
		Object.entries(value.fileSizes).some(([file, count]) => {
			const limit = sizeLimit(file)
			return (
				limit === null || typeof count !== 'number' || !Number.isInteger(count) || count <= limit
			)
		})
	)
		throw new Error(
			'Invalid quality baseline: expected only fileSizes with oversized production-file counts'
		)
	return value as Baseline
}

export function checkSizes(
	files: Map<string, string>,
	current: Baseline,
	previous: Baseline
): string[] {
	const problems: string[] = []
	const actual = inventory(files).fileSizes
	for (const [file, count] of Object.entries(actual)) {
		const ceiling = current.fileSizes[file] ?? sizeLimit(file)!
		if (count > ceiling)
			problems.push(`${file}: ${count} lines; limit ${ceiling}. Extract a coherent responsibility.`)
	}
	for (const [file, ceiling] of Object.entries(current.fileSizes)) {
		if (!(file in previous.fileSizes) || ceiling > previous.fileSizes[file]) {
			problems.push(`${file}: new or increased baseline allowance is not permitted.`)
		}
		if (actual[file] !== ceiling)
			problems.push(
				actual[file] === undefined
					? `${file}: remove the baseline entry; the file is no longer oversized.`
					: `${file}: set the baseline to the actual ${actual[file]} lines (without increasing its allowance).`
			)
	}
	return problems
}

function git(root: string, args: string[]): string {
	return execFileSync('git', args, {
		cwd: root,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe']
	})
}

export function sourceFiles(root: string): Map<string, string> {
	const paths = git(root, [
		'ls-files',
		'-z',
		'--cached',
		'--others',
		'--exclude-standard',
		'--',
		'src'
	])
	return new Map(
		[...new Set(paths.split('\0').filter(Boolean))]
			.sort()
			.filter((file) => sizeLimit(file) !== null && existsSync(join(root, file)))
			.map((file) => [file, readFileSync(join(root, file), 'utf8')])
	)
}

export function baselineAt(root: string, ref: string): Baseline {
	try {
		git(root, ['rev-parse', '--verify', `${ref}^{commit}`])
	} catch {
		throw new Error(
			`Cannot resolve quality base ${ref}. Fetch the target branch or set QUALITY_BASE_REF to an available target commit.`
		)
	}
	const paths = git(root, ['ls-tree', '-r', '--name-only', '-z', ref]).split('\0').filter(Boolean)
	if (paths.includes('quality-baseline.json')) {
		return parseBaseline(git(root, ['show', `${ref}:quality-baseline.json`]))
	}
	// The first adoption may grandfather only files already oversized on the target.
	return inventory(
		new Map(
			paths
				.filter((file) => sizeLimit(file) !== null)
				.map((file) => [file, git(root, ['show', `${ref}:${file}`])])
		)
	)
}
