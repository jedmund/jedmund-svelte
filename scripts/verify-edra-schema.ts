import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { getSchema, type Extensions } from '@tiptap/core'
import assert from 'node:assert/strict'
import { EditorState } from '@tiptap/pm/state'
import { history, undo } from '@tiptap/pm/history'
import { loadEnvironment, requireLocal } from './lib/database.ts'
import { extractRichTextMediaIds } from '../src/lib/editor/media-references.ts'
import { renderEdraContent } from '../src/lib/utils/content.ts'
import svg from '@poppanator/sveltekit-svg'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import autoprefixer from 'autoprefixer'
import { createServer } from 'vite'
import {
	compareEditorJson,
	normalizeEditorJson,
	normalizeSchemaRoundTripJson,
	type CorpusDocument,
	type RichTextDocument
} from '../src/lib/editor/schema-contract.ts'

const corpusFlag = process.argv.indexOf('--corpus')
const envFlag = process.argv.indexOf('--env-file')
Object.assign(process.env, loadEnvironment(envFlag >= 0 ? process.argv[envFlag + 1] : undefined))
const { PrismaClient, Prisma } = await import('@prisma/client')
const persist = process.argv.includes('--persist')
if (persist && !requireLocal(process.env.DATABASE_URL).name.startsWith('jedmund_edra_test_'))
	throw new Error('Persistence verification requires an isolated jedmund_edra_test_ database')
const prisma = persist ? new PrismaClient() : undefined
const corpusPath = resolve(
	corpusFlag >= 0 && process.argv[corpusFlag + 1]
		? process.argv[corpusFlag + 1]!
		: 'tests/fixtures/edra-documents.json'
)

const server = await createServer({
	appType: 'custom',
	configFile: false,
	logLevel: 'error',
	plugins: [
		svelte({ configFile: 'svelte.config.js', hot: false }),
		svg({ includePaths: ['./src/assets/icons/'] })
	],
	resolve: {
		alias: {
			'$app/environment': resolve('scripts/sveltekit-environment.ts'),
			$components: resolve('src/lib/components'),
			$icons: resolve('src/assets/icons'),
			$lib: resolve('src/lib'),
			$styles: resolve('src/assets/styles')
		}
	},
	css: {
		preprocessorOptions: {
			scss: {
				additionalData: `@use 'sass:color';\n@use 'sass:math';\n@use '$styles/imports.scss' as *;`,
				api: 'modern-compiler'
			}
		},
		postcss: { plugins: [autoprefixer] }
	},
	server: {
		middlewareMode: true,
		hmr: false,
		// Vite 5 supports this internal switch for transform-only middleware servers.
		...{ ws: false }
	}
})

try {
	const [{ getBaseEditorExtensions }, { getEditorExtensions }] = await Promise.all([
		server.ssrLoadModule('/src/lib/editor/jedmund/editor.ts'),
		server.ssrLoadModule('/src/lib/editor/jedmund/editor-extensions.ts')
	])

	const extensions = [
		...(getBaseEditorExtensions() as Extensions),
		...(getEditorExtensions({ showSlashCommands: false }) as Extensions)
	]
	const schema = getSchema(extensions)
	assert.equal(extensions.filter((extension) => extension.name === 'selectAcrossAtoms').length, 1)
	assert.throws(() => schema.nodeFromJSON({ type: 'doc', content: [{ type: 'listItem' }] }).check())
	assert.throws(() => schema.nodeFromJSON({ type: 'doc', content: [{ type: 'unknownNode' }] }))
	const unknownAttribute = {
		type: 'doc' as const,
		content: [{ type: 'paragraph', attrs: { unknown: null } }]
	}
	assert.ok(
		compareEditorJson(
			normalizeSchemaRoundTripJson(unknownAttribute),
			normalizeSchemaRoundTripJson(
				schema.nodeFromJSON(unknownAttribute).toJSON() as RichTextDocument
			)
		).length > 0
	)
	const documents = JSON.parse(await readFile(corpusPath, 'utf8')) as CorpusDocument[]
	if (corpusFlag < 0)
		documents.push(...JSON.parse(await readFile('tests/fixtures/edra-compatibility.json', 'utf8')))
	const failures: string[] = []

	for (const document of documents) {
		let roundTripped: RichTextDocument
		try {
			const parsed = schema.nodeFromJSON(document.content)
			parsed.check()
			roundTripped = parsed.toJSON() as RichTextDocument
			const reopened = schema.nodeFromJSON(roundTripped)
			reopened.check()
			assert.deepEqual(reopened.toJSON(), roundTripped)
			assert.deepEqual(
				extractRichTextMediaIds(roundTripped),
				extractRichTextMediaIds(document.content)
			)
			assert.equal(
				renderEdraContent(normalizeSchemaRoundTripJson(roundTripped)),
				renderEdraContent(normalizeSchemaRoundTripJson(document.content))
			)
			let state = EditorState.create({ doc: parsed, plugins: [history()] })
			let insertion: number | undefined
			parsed.descendants((node, pos) => {
				if (insertion === undefined && node.isTextblock) insertion = pos + 1
			})
			if (insertion !== undefined) {
				state = state.apply(state.tr.insertText('edra-test', insertion))
				state.doc.check()
				assert.notDeepEqual(state.doc.toJSON(), parsed.toJSON())
				assert.equal(
					undo(state, (tr) => {
						state = state.apply(tr)
					}),
					true
				)
				assert.deepEqual(state.doc.toJSON(), parsed.toJSON())
			}
		} catch (error) {
			failures.push(
				`${document.source}#${document.id}.${document.field}: ${
					error instanceof Error ? error.message : String(error)
				}`
			)
			continue
		}

		const differences = compareEditorJson(
			normalizeSchemaRoundTripJson(document.content),
			normalizeSchemaRoundTripJson(roundTripped)
		)
		if (differences.length > 0) {
			const summary = differences
				.slice(0, 5)
				.map(
					(difference) =>
						`${difference.kind} ${difference.path} (${JSON.stringify(difference.before)} → ${JSON.stringify(difference.after)})`
				)
				.join(', ')
			failures.push(`${document.source}#${document.id}.${document.field}: ${summary}`)
		}
		if (prisma && differences.length === 0) {
			const fields: Record<string, string> = {
				Post: 'content',
				Project: 'caseStudyContent',
				Album: 'content',
				GardenItem: 'note'
			}
			assert.equal(fields[document.source], document.field)
			const table = Prisma.raw(`"${document.source}"`),
				column = Prisma.raw(`"${document.field}"`)
			const rollback = new Error('intentional verification rollback')
			try {
				await prisma.$transaction(async (tx) => {
					const before = await tx.$queryRaw<{ value: unknown }[]>(
						Prisma.sql`SELECT ${column} AS value FROM ${table} WHERE id = ${Number(document.id)}`
					)
					assert.equal(before.length, 1)
					assert.deepEqual(
						before[0]!.value,
						document.content,
						'Corpus is stale relative to the local clone'
					)
					assert.equal(
						await tx.$executeRaw(
							Prisma.sql`UPDATE ${table} SET ${column} = ${JSON.stringify(roundTripped)}::jsonb WHERE id = ${Number(document.id)}`
						),
						1
					)
					const rows = await tx.$queryRaw<{ value: unknown }[]>(
						Prisma.sql`SELECT ${column} AS value FROM ${table} WHERE id = ${Number(document.id)}`
					)
					assert.deepEqual(normalizeEditorJson(rows[0]!.value), normalizeEditorJson(roundTripped))
					throw rollback
				})
			} catch (error) {
				if (error !== rollback) throw error
			}
			const restored = await prisma.$queryRaw<{ value: unknown }[]>(
				Prisma.sql`SELECT ${column} AS value FROM ${table} WHERE id = ${Number(document.id)}`
			)
			assert.deepEqual(restored[0]!.value, document.content)
		}
	}

	if (failures.length > 0) {
		throw new Error(
			`TipTap v3 schema round-trip failed for ${failures.length} document(s):\n${failures.join('\n')}`
		)
	}

	console.log(
		`Verified ${documents.length} documents: structure, schema, rendering, media references, undo${persist ? ', and local Prisma persistence (rolled back)' : ''}`
	)
} finally {
	await prisma?.$disconnect()
	await server.close()
}
