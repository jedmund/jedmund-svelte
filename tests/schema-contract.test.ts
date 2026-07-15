import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
	compareEditorJson,
	createSchemaManifest,
	isRichTextDocument,
	normalizeEditorJson,
	normalizeSchemaRoundTripJson,
	type CorpusDocument
} from '../src/lib/editor/schema-contract.ts'

const fixtureUrl = new URL('./fixtures/edra-documents.json', import.meta.url)
const documents = JSON.parse(readFileSync(fixtureUrl, 'utf8')) as CorpusDocument[]

test('recognizes TipTap documents and rejects non-doc JSON', () => {
	assert.equal(isRichTextDocument(documents[0]?.content), true)
	assert.equal(isRichTextDocument({ blocks: [] }), false)
	assert.equal(isRichTextDocument(null), false)
})

test('creates a manifest for nodes, marks, and typed attributes', () => {
	const manifest = createSchemaManifest(documents)

	assert.equal(manifest.documents, 3)
	assert.equal(manifest.nodes.doc, 3)
	assert.equal(manifest.nodes.image, 1)
	assert.equal(manifest.nodes.gallery, 1)
	assert.equal(manifest.nodes.tableCell, 1)
	assert.equal(manifest.marks.bold, 1)
	assert.equal(manifest.marks.link, 1)
	assert.deepEqual(manifest.attributes['node:image.mediaId']?.types, { string: 1 })
	assert.deepEqual(manifest.attributes['node:audio.waveformData']?.types, { array: 1 })
	assert.deepEqual(manifest.attributes['node:urlEmbed.faviconMediaId']?.types, { number: 1 })
})

test('normalization is stable without changing array order', () => {
	assert.deepEqual(normalizeEditorJson({ z: 1, a: [{ y: 2, x: 1 }] }), {
		a: [{ x: 1, y: 2 }],
		z: 1
	})
})

test('reports removed media attributes with their exact JSON path', () => {
	const before = documents[0]!.content
	const after = structuredClone(before)
	delete after.content?.[2]?.attrs?.mediaId

	assert.deepEqual(compareEditorJson(before, after), [
		{
			path: '$.content[2].attrs.mediaId',
			kind: 'removed',
			before: '41'
		}
	])
})

test('reports value and type changes separately', () => {
	const before = { type: 'doc', content: [{ type: 'paragraph', attrs: { level: 1 } }] }
	const changed = { type: 'doc', content: [{ type: 'paragraph', attrs: { level: 2 } }] }
	const typeChanged = { type: 'doc', content: [{ type: 'paragraph', attrs: { level: '1' } }] }

	assert.equal(compareEditorJson(before, changed)[0]?.kind, 'changed')
	assert.equal(compareEditorJson(before, typeChanged)[0]?.kind, 'type-changed')
})

test('normalizes schema defaults and mark ordering without hiding persisted attributes', () => {
	const before = {
		type: 'doc' as const,
		content: [
			{
				type: 'paragraph',
				content: [
					{
						type: 'text',
						text: 'Link',
						marks: [
							{ type: 'bold' },
							{ type: 'link', attrs: { href: 'https://example.com', target: '_blank' } }
						]
					}
				]
			}
		]
	}
	const after = {
		type: 'doc' as const,
		content: [
			{
				type: 'paragraph',
				attrs: { textAlign: null },
				content: [
					{
						type: 'text',
						text: 'Link',
						marks: [
							{
								type: 'link',
								attrs: {
									href: 'https://example.com',
									target: '_blank',
									rel: 'noopener noreferrer nofollow',
									title: null
								}
							},
							{ type: 'bold' }
						]
					}
				]
			}
		]
	}

	assert.deepEqual(normalizeSchemaRoundTripJson(before), normalizeSchemaRoundTripJson(after))

	const changed = structuredClone(after)
	changed.content[0]!.content[0]!.marks[0]!.attrs!.href = 'https://changed.example'
	assert.notDeepEqual(normalizeSchemaRoundTripJson(before), normalizeSchemaRoundTripJson(changed))
})
