import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { getSchema, type Extensions } from '@tiptap/core'
import svg from '@poppanator/sveltekit-svg'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import autoprefixer from 'autoprefixer'
import { createServer } from 'vite'
import {
	compareEditorJson,
	normalizeSchemaRoundTripJson,
	type CorpusDocument,
	type RichTextDocument
} from '../src/lib/editor/schema-contract.ts'

const corpusFlag = process.argv.indexOf('--corpus')
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
		// @ts-expect-error `ws` is implemented but omitted from ServerOptions.
		ws: false
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
	const documents = JSON.parse(await readFile(corpusPath, 'utf8')) as CorpusDocument[]
	const failures: string[] = []

	for (const document of documents) {
		let roundTripped: RichTextDocument
		try {
			roundTripped = schema.nodeFromJSON(document.content).toJSON() as RichTextDocument
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
	}

	if (failures.length > 0) {
		throw new Error(
			`TipTap v3 schema round-trip failed for ${failures.length} document(s):\n${failures.join('\n')}`
		)
	}

	console.log(`Verified ${documents.length} documents against the TipTap v3 schema`)
} finally {
	await server.close()
}
