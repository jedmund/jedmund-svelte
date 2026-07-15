import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
	createSchemaManifest,
	isRichTextDocument,
	normalizeEditorJson,
	type CorpusDocument
} from '../src/lib/editor/schema-contract.ts'
import {
	getContentExcerpt,
	renderEdraContent,
	renderInlineExcerpt
} from '../src/lib/utils/content.ts'

interface RendererSnapshot {
	source: string
	id: string | number
	field: string
	html: string
	inlineExcerpt: ReturnType<typeof renderInlineExcerpt>
	excerpt: string
}

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

const snapshotPath = resolve(outputDir, 'renderer-snapshots.json')

const createSnapshots = (documents: CorpusDocument[]): RendererSnapshot[] =>
	documents.map((document) => ({
		source: document.source,
		id: document.id,
		field: document.field,
		html: renderEdraContent(document.content),
		inlineExcerpt: renderInlineExcerpt(document.content),
		excerpt: getContentExcerpt(document.content)
	}))

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
		const corpus = JSON.parse(
			await readFile(resolve(outputDir, 'documents.json'), 'utf8')
		) as CorpusDocument[]
		const expected = normalizeEditorJson(JSON.parse(await readFile(snapshotPath, 'utf8')))
		const actual = normalizeEditorJson(createSnapshots(corpus))
		if (JSON.stringify(expected) !== JSON.stringify(actual)) {
			throw new Error(
				`Renderer snapshots differ. Re-run without --verify and review ${snapshotPath}`
			)
		}
		console.log(`Verified ${corpus.length} renderer snapshots in ${outputDir}`)
		return
	}

	const documents = await loadCorpus()
	const manifest = createSchemaManifest(documents)
	const snapshots = createSnapshots(documents)

	await Promise.all([
		writeFile(resolve(outputDir, 'documents.json'), stableJson(documents), { mode: 0o600 }),
		writeFile(resolve(outputDir, 'schema-manifest.json'), stableJson(manifest), { mode: 0o600 }),
		writeFile(snapshotPath, stableJson(snapshots), { mode: 0o600 })
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
