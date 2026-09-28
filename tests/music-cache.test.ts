import assert from 'node:assert/strict'
import test from 'node:test'
import { createAppleAlbumCache } from '../src/lib/server/music/album-cache.ts'
import {
	albumsMatch,
	artistsMatch,
	containsJapanese
} from '../src/lib/server/apple-music-matching.ts'

test('album matching preserves punctuation/case, collaborations and Japanese storefront detection', () => {
	assert.equal(albumsMatch('ALBUM Deluxe', 'album'), true)
	assert.equal(albumsMatch('ALBUM', 'album', true), false)
	assert.equal(artistsMatch('Artist', 'Artist, Guest'), true)
	assert.equal(artistsMatch('Other', 'Artist'), false)
	assert.equal(containsJapanese('東京'), true)
	assert.equal(containsJapanese('Album'), false)
})

test('parallel enrichment and now-playing share a lookup and retain the 24-hour cache contract', async () => {
	let calls = 0
	const entries = new Map<string, string>()
	const writes: number[] = []
	const load = createAppleAlbumCache({
		get: async (key) => entries.get(key) ?? null,
		set: async (key, value, ttl) => {
			entries.set(key, value)
			writes.push(ttl)
		},
		load: async () => {
			calls++
			return { appleMusicId: 'album-1', tracks: [] }
		}
	})
	const [a, b] = await Promise.all([load('Artist', 'Album'), load('Artist', 'Album')])
	assert.deepEqual(a, b)
	assert.equal(calls, 1)
	assert.deepEqual(writes, [86400])
	assert.equal(entries.has('apple:album:Artist:Album'), true)
	await load('Artist', 'Album')
	assert.equal(calls, 1)
})

test('invalid cache JSON is replaced and rejected lookups can be retried', async () => {
	let calls = 0
	const load = createAppleAlbumCache({
		get: async () => 'not-json',
		set: async () => {},
		load: async () => {
			calls++
			if (calls === 1) throw new Error('offline')
			return { appleMusicId: 'recovered' }
		}
	})
	await assert.rejects(load('Artist', 'Album'), /offline/)
	assert.deepEqual(await load('Artist', 'Album'), { appleMusicId: 'recovered' })
	assert.equal(calls, 2)
})
