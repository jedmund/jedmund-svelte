import { loadEnvironment } from './lib/database.ts'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
	createSchemaManifest,
	isRichTextDocument,
	normalizeEditorJson,
	type CorpusDocument
} from '../src/lib/editor/schema-contract.ts'

const envFlag = process.argv.indexOf('--env-file')
Object.assign(process.env, loadEnvironment(envFlag >= 0 ? process.argv[envFlag + 1] : undefined))
const { PrismaClient } = await import('@prisma/client')
const prisma = new PrismaClient()
const mode = process.argv.includes('--verify') ? 'verify' : 'snapshot'
const outputFlag = process.argv.indexOf('--output')
const outputDir = resolve(
	outputFlag >= 0 && process.argv[outputFlag + 1]
		? process.argv[outputFlag + 1]!
		: 'artifacts/edra-corpus'
)

const stableJson = (value: unknown): string =>
	`${JSON.stringify(normalizeEditorJson(value), null, 2)}\n`

const loadCorpus = async (): Promise<CorpusDocument[]> => {
	const [posts, projects, albums, gardenItems] = await Promise.all([
		prisma.post.findMany({ select: { id: true, content: true }, orderBy: { id: 'asc' } }),
		prisma.project.findMany({
			select: { id: true, caseStudyContent: true },
			orderBy: { id: 'asc' }
		}),
		prisma.album.findMany({ select: { id: true, content: true }, orderBy: { id: 'asc' } }),
		prisma.gardenItem.findMany({ select: { id: true, note: true }, orderBy: { id: 'asc' } })
	])

	const candidates = [
		...posts.map(({ id, content }) => ({ source: 'Post', id, field: 'content', content })),
		...projects.map(({ id, caseStudyContent }) => ({
			source: 'Project',
			id,
			field: 'caseStudyContent',
			content: caseStudyContent
		})),
		...albums.map(({ id, content }) => ({ source: 'Album', id, field: 'content', content })),
		...gardenItems.map(({ id, note }) => ({
			source: 'GardenItem',
			id,
			field: 'note',
			content: note
		}))
	]

	const invalid = candidates.filter(
		(candidate) => candidate.content !== null && !isRichTextDocument(candidate.content)
	)
	if (invalid.length > 0) {
		const labels = invalid.map(({ source, id, field }) => `${source}#${id}.${field}`).join(', ')
		throw new Error(`Non-TipTap JSON found in rich-text columns: ${labels}`)
	}

	return candidates
		.filter((candidate) => isRichTextDocument(candidate.content))
		.map((candidate) => candidate as CorpusDocument)
}

const run = async (): Promise<void> => {
	await mkdir(outputDir, { recursive: true })

	if (mode === 'verify') {
		const { verifyRenderers } = await import('./lib/renderer-comparison.ts')
		const arg = (name: string) =>
			process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : undefined
		await verifyRenderers(
			arg('--corpus') ?? resolve(outputDir, 'documents.json'),
			arg('--baseline-ref') ?? '2a6fe469f293b31b5b1a25384ec981f5c00ba941',
			outputDir,
			arg('--baseline-root')
		)
		return
	}

	const documents = await loadCorpus()
	const manifest = createSchemaManifest(documents)

	await Promise.all([
		writeFile(resolve(outputDir, 'documents.json'), stableJson(documents), { mode: 0o600 }),
		writeFile(resolve(outputDir, 'schema-manifest.json'), stableJson(manifest), { mode: 0o600 })
	])

	console.log(`Wrote ${documents.length} private corpus documents to ${outputDir}`)
	console.log(
		`Observed ${Object.keys(manifest.nodes).length} node types and ${Object.keys(manifest.marks).length} mark types`
	)
}

run()
	.catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : error)
		process.exitCode = 1
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
