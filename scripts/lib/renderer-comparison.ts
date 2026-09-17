import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import type { CorpusDocument } from '../../src/lib/editor/schema-contract.ts'

const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')
const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim()
type Snapshot = {
	key: string
	html: string
	albumHtml: string
	inlineExcerpt: unknown
	excerpt: string
	rss: string
}
export async function renderCorpus(root: string, documents: CorpusDocument[]): Promise<Snapshot[]> {
	if (!existsSync(resolve(root, '.svelte-kit/tsconfig.json'))) {
		const sync = spawnSync(resolve(root, 'node_modules/.bin/svelte-kit'), ['sync'], {
			cwd: root,
			encoding: 'utf8'
		})
		assert.equal(sync.status, 0, `Renderer SvelteKit sync failed: ${sync.stderr}`)
	}
	const server = await createServer({
		root,
		configFile: false,
		appType: 'custom',
		logLevel: 'error',
		esbuild: {
			tsconfigRaw: { compilerOptions: { target: 'ES2022', useDefineForClassFields: true } }
		},
		resolve: { alias: { $lib: resolve(root, 'src/lib') } },
		server: {
			middlewareMode: true,
			hmr: false,
			// Vite's internal transform-only switch avoids opening a socket.
			...{ ws: false }
		}
	})
	try {
		const renderer = await server.ssrLoadModule('/src/lib/utils/content.ts')
		const rss = await server.ssrLoadModule('/src/lib/server/rss/helpers.ts')
		return documents.map((d) => ({
			key: `${d.source}#${d.id}.${d.field}`,
			html: renderer.renderEdraContent(d.content),
			albumHtml: renderer.renderEdraContent(d.content, { albumSlug: 'test-album' }),
			inlineExcerpt: renderer.renderInlineExcerpt(d.content),
			excerpt: renderer.getContentExcerpt(d.content),
			rss: rss.convertContentToHTML(d.content)
		}))
	} finally {
		await server.close()
	}
}

export async function verifyRenderers(
	corpusPath: string,
	baselineRef: string,
	output: string,
	suppliedRoot?: string
) {
	await mkdir(output, { recursive: true, mode: 0o700 })
	const sha = git('rev-parse', '--verify', `${baselineRef}^{commit}`)
	const root = resolve(suppliedRoot ?? `${output}/baseline-${sha}`)
	if (!existsSync(root)) {
		await mkdir(root, { recursive: true })
		const archive = execFileSync('git', ['archive', sha], { maxBuffer: 100 * 1024 * 1024 })
		const unpack = spawnSync('tar', ['-x', '-C', root], { input: archive })
		if (unpack.status !== 0) throw new Error('Could not extract baseline source')
	}
	for (const path of [
		'src/lib/utils/content.ts',
		'src/lib/server/rss/helpers.ts',
		'pnpm-lock.yaml'
	]) {
		assert.equal(
			hash(await readFile(resolve(root, path))),
			hash(execFileSync('git', ['show', `${sha}:${path}`])),
			`Baseline ${path} does not match ${sha}`
		)
	}
	if (!existsSync(resolve(root, 'node_modules'))) {
		const install = spawnSync(
			'corepack',
			['pnpm', 'install', '--frozen-lockfile', '--ignore-scripts'],
			{ cwd: root, env: { ...process.env, CI: 'true' }, encoding: 'utf8' }
		)
		if (install.status !== 0)
			throw new Error(`Baseline dependency installation failed: ${install.stderr}`)
	}
	const sync = spawnSync('corepack', ['pnpm', 'exec', 'svelte-kit', 'sync'], {
		cwd: root,
		encoding: 'utf8'
	})
	if (sync.status !== 0) throw new Error(`Baseline SvelteKit sync failed: ${sync.stderr}`)
	const raw = await readFile(corpusPath, 'utf8')
	const documents = JSON.parse(raw) as CorpusDocument[]
	const before = await renderCorpus(root, documents)
	const baseline = {
		ref: sha,
		lockHash: hash(await readFile(resolve(root, 'pnpm-lock.yaml'))),
		corpusHash: hash(raw),
		snapshots: before
	}
	const baselinePath = resolve(output, 'baseline-renderer.json')
	if (existsSync(baselinePath))
		assert.deepEqual(
			JSON.parse(await readFile(baselinePath, 'utf8')),
			baseline,
			'Frozen baseline differs; use a new output directory for a new corpus'
		)
	else await writeFile(baselinePath, JSON.stringify(baseline, null, 2), { mode: 0o600, flag: 'wx' })
	const after = await renderCorpus(process.cwd(), documents)
	const differences = before.flatMap((entry, index) => {
		const candidate = after[index]!
		return JSON.stringify(entry) === JSON.stringify(candidate)
			? []
			: [
					{
						key: entry.key,
						beforeHash: hash(JSON.stringify(entry)),
						afterHash: hash(JSON.stringify(candidate)),
						before: entry,
						after: candidate
					}
				]
	})
	const approvalsPath = resolve(output, 'approved-renderer-differences.json')
	const approvals = existsSync(approvalsPath)
		? (JSON.parse(await readFile(approvalsPath, 'utf8')) as {
				key: string
				beforeHash: string
				afterHash: string
				reason: string
			}[])
		: []
	const unexplained = differences.filter(
		(diff) =>
			!approvals.some(
				(a) =>
					a.key === diff.key &&
					a.beforeHash === diff.beforeHash &&
					a.afterHash === diff.afterHash &&
					a.reason?.trim()
			)
	)
	const report = {
		baselineRef: sha,
		candidateRef: git('rev-parse', 'HEAD'),
		candidateRendererHash: hash(await readFile('src/lib/utils/content.ts')),
		candidateLockHash: hash(await readFile('pnpm-lock.yaml')),
		corpusHash: hash(raw),
		documents: documents.length,
		differences: differences.length,
		unexplained: unexplained.length
	}
	await writeFile(
		resolve(output, 'renderer-differences.json'),
		JSON.stringify(differences, null, 2),
		{ mode: 0o600 }
	)
	await writeFile(resolve(output, 'verification-report.json'), JSON.stringify(report, null, 2), {
		mode: 0o600
	})
	console.log(
		`Renderer baseline: ${documents.length} documents, ${differences.length} differences, ${unexplained.length} unexplained`
	)
	if (unexplained.length)
		throw new Error(
			'Review renderer-differences.json; explain each exact before/after hash in approved-renderer-differences.json. Verification never regenerates the baseline.'
		)
}
