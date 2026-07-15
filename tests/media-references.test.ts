import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import type { CorpusDocument } from '../src/lib/editor/schema-contract.ts'
import { extractRichTextMediaIds } from '../src/lib/editor/media-references.ts'

const documents = JSON.parse(
	readFileSync(new URL('./fixtures/edra-documents.json', import.meta.url), 'utf8')
) as CorpusDocument[]

test('tracks string and numeric media IDs across every custom media node', () => {
	const content = {
		type: 'doc',
		content: [...(documents[0]!.content.content ?? []), ...(documents[1]!.content.content ?? [])]
	}

	assert.deepEqual(extractRichTextMediaIds(content), [41, 42, 43, 44, 45, 46])
})

test('falls back to API media URLs and de-duplicates references', () => {
	assert.deepEqual(
		extractRichTextMediaIds({
			type: 'doc',
			content: [
				{ type: 'image', attrs: { src: '/api/media/50/image.jpg' } },
				{ type: 'video', attrs: { mediaId: '50', src: '/api/media/50/video.mp4' } }
			]
		}),
		[50]
	)
})
