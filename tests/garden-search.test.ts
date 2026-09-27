import assert from 'node:assert/strict'
import test from 'node:test'
import { SEARCH_CONFIGS, createSearchFn } from '../src/lib/constants/garden.ts'

test('maps every searchable category while preserving creator and metadata differences', () => {
	for (const [category, config] of Object.entries(SEARCH_CONFIGS)) {
		const result = config.mapResult({
			id: 42,
			name: 'Title',
			image: '/cover.jpg',
			year: '2026',
			author: 'Author',
			artist: 'Artist',
			director: 'Director',
			developer: 'Developer',
			originalName: 'Original',
			metadata: { episodes: 12, runtime: null },
			summary: 'Summary'
		})
		const creator = {
			books: 'Author',
			games: 'Developer',
			music: 'Artist',
			manga: 'Author',
			movies: 'Director',
			'tv-shows': null
		}[category]
		assert.equal(result.creator, creator)
		assert.equal(result.sourceId, '42')
		assert.equal(result.subtitle, category === 'tv-shows' ? '2026 · Original' : `${creator} · 2026`)
		assert.deepEqual(
			result.metadata,
			['manga', 'movies', 'tv-shows'].includes(category) ? { episodes: 12, runtime: null } : null
		)
		assert.equal(result.summary, 'Summary')
	}
})

test('normalizes missing optional search values and preserves explicit source IDs', () => {
	for (const config of Object.values(SEARCH_CONFIGS)) {
		assert.deepEqual(config.mapResult({ id: 'item', name: 'Title', sourceId: 'external' }), {
			id: 'item',
			name: 'Title',
			subtitle: null,
			image: null,
			creator: null,
			year: null,
			sourceId: 'external',
			metadata: null,
			summary: null
		})
		assert.throws(() => config.mapResult({ name: 'Missing ID' }))
	}
})

test('search encodes queries, maps results, and handles an absent results list', async (t) => {
	const requested: string[] = []
	t.mock.method(globalThis, 'fetch', async (url: string) => {
		requested.push(url)
		return Response.json(requested.length === 1 ? { results: [{ id: 7, name: 'Book' }] } : {})
	})
	const search = createSearchFn(SEARCH_CONFIGS.books!)
	assert.equal((await search('a & b', 3))[0]?.sourceId, '7')
	assert.equal(requested[0], '/api/admin/garden/search/books?q=a%20%26%20b&limit=3')
	assert.deepEqual(await search('empty'), [])
})
