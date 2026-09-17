import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import type { CorpusDocument } from '../src/lib/editor/schema-contract.ts'
import {
	getContentExcerpt,
	renderEdraContent,
	renderInlineExcerpt
} from '../src/lib/utils/content.ts'

const fixtureUrl = new URL('./fixtures/edra-documents.json', import.meta.url)
const documents = JSON.parse(readFileSync(fixtureUrl, 'utf8')) as CorpusDocument[]

test('renders media nodes without dropping Jedmund media semantics', () => {
	const html = renderEdraContent(documents[0]!.content)

	assert.match(html, /class="interactive-figure"/)
	assert.match(html, /href="\/photos\/41"/)
	assert.match(html, /class="video-figure"/)
	assert.match(html, /data-audio-player/)
	assert.match(html, /data-waveform=/)
})

test('renders app-owned gallery, geolocation, URL embed, and iframe nodes', () => {
	const html = renderEdraContent(documents[1]!.content)

	assert.match(html, /class="edra-gallery-container"/)
	assert.match(html, /href="\/photos\/44"/)
	assert.match(html, /class="geolocation-rendered"/)
	assert.match(html, /openstreetmap\.org/)
	assert.match(html, /class="url-embed-rendered"/)
	assert.match(html, /class="iframe-wrapper"/)
})

test('renders table and task structures instead of flattening or dropping them', () => {
	const html = renderEdraContent(documents[2]!.content)

	assert.match(html, /<table>/)
	assert.match(html, /<th><p>Header<\/p><\/th>/)
	assert.match(html, /<td><p>Cell<\/p><\/td>/)
	assert.match(html, /data-type="taskList"/)
	assert.match(html, /data-checked="true"/)
})

test('preserves marked inline excerpts and plain-text excerpts', () => {
	assert.deepEqual(renderInlineExcerpt(documents[0]!.content), {
		html: '<a href="https://example.com" target="_blank" rel="noopener noreferrer"><strong>Marked link</strong></a>',
		truncated: true
	})
	assert.match(getContentExcerpt(documents[2]!.content), /Header/)
	assert.match(getContentExcerpt(documents[2]!.content), /Done/)
})

test('uses album-context permalinks without changing other image markup', () => {
	const document = {
		type: 'doc',
		content: [
			{ type: 'image', attrs: { src: '/api/media/41/image.jpg', mediaId: 41, alt: 'Photo' } }
		]
	}
	assert.equal(
		renderEdraContent(document, { albumSlug: 'test-album' }),
		renderEdraContent(document).replace('href="/photos/41"', 'href="/photos/test-album/41"')
	)
})

test('sanitizes hostile HTML and URLs in persisted content', () => {
	const html = renderEdraContent({
		type: 'doc',
		content: [
			{
				type: 'paragraph',
				content: [
					{
						type: 'text',
						text: '<script>alert(1)</script>',
						marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }]
					}
				]
			},
			{ type: 'image', attrs: { src: 'javascript:alert(1)', alt: '\" onerror=\"alert(1)' } }
		]
	})
	assert.doesNotMatch(html, /<script|href="javascript:|src="javascript:|<img[^>]*\sonerror=/i)
})
