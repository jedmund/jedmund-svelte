import assert from 'node:assert/strict'
import test from 'node:test'
import type { Album } from '../src/lib/types/lastfm.ts'
import {
	createAppleSearch,
	type AppleSearchState
} from '../src/lib/components/debug/apple-search.ts'
import {
	observeDiagnostics,
	trackTiming,
	type DiagnosticState,
	type DiagnosticStreamState
} from '../src/lib/components/debug/diagnostic-stream.ts'
import { createDebugCacheSession } from '../src/lib/components/debug/cache-session.ts'
import { clearDebugCache, searchAppleMusic } from '../src/lib/components/debug/debug-requests.ts'

function deferred<T>() {
	let resolve!: (value: T) => void
	let reject!: (error: unknown) => void
	const promise = new Promise<T>((yes, no) => {
		resolve = yes
		reject = no
	})
	return { promise, resolve, reject }
}

test('disabled diagnostics never subscribe or allocate update timers', (t) => {
	t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] })
	let calls = 0
	const dispose = observeDiagnostics(
		false,
		() => {
			calls++
			return () => {}
		},
		() => {
			calls++
		}
	)
	t.mock.timers.tick(10000)
	dispose()
	assert.equal(calls, 0)
})

test('diagnostics use one subscription and cancel flash/countdown timers on teardown', (t) => {
	t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 1000 })
	let receive!: (state: DiagnosticStreamState) => void
	let unsubscribed = false
	const states: DiagnosticState[] = []
	const dispose = observeDiagnostics(
		true,
		(update) => {
			receive = update
			return () => {
				unsubscribed = true
			}
		},
		(state) => states.push(state)
	)
	receive({ albums: [], connected: true, lastUpdate: new Date() })
	assert.equal(states.at(-1)?.updateFlash, true)
	t.mock.timers.tick(500)
	assert.equal(states.at(-1)?.updateFlash, false)
	t.mock.timers.tick(500)
	assert.equal(states.at(-1)?.nextUpdateIn, 29)
	receive({ albums: [], connected: true, lastUpdate: new Date() })
	dispose()
	const count = states.length
	t.mock.timers.tick(10000)
	assert.equal(unsubscribed, true)
	assert.equal(states.length, count)
})

test('diagnostic intervals preserve track timing boundaries', () => {
	const album = {
		isNowPlaying: true,
		nowPlayingTrack: 'Track',
		lastScrobbleTime: new Date(0),
		appleMusicData: { tracks: [{ name: 'Track', durationMs: 120000 }] }
	} as Album
	assert.deepEqual(trackTiming([album], 0), { trackRemainingTime: 120, updateInterval: 15 })
	assert.deepEqual(trackTiming([album], 70000), { trackRemainingTime: 50, updateInterval: 10 })
	assert.deepEqual(trackTiming([album], 110000), { trackRemainingTime: 10, updateInterval: 5 })
	assert.deepEqual(trackTiming([], 0), { trackRemainingTime: 0, updateInterval: 30 })
})

test('search is inert while closed; replacement and close/reopen cannot accept stale responses', async () => {
	let state!: AppleSearchState
	const calls: Array<{
		query: string
		signal: AbortSignal
		result: ReturnType<typeof deferred<unknown>>
	}> = []
	const session = createAppleSearch(
		(next) => {
			state = next
		},
		async (query, _storefront, signal) => {
			const result = deferred<unknown>()
			calls.push({ query, signal, result })
			return result.promise
		}
	)
	await session.search('hidden', 'us')
	assert.equal(calls.length, 0)
	session.open()
	const first = session.search('first', 'us')
	const second = session.search('second', 'jp')
	assert.equal(calls[0].signal.aborted, true)
	calls[1].result.resolve({ newer: true })
	await second
	calls[0].result.resolve({ stale: true })
	await first
	assert.deepEqual(state.results, { newer: true })
	const old = session.search('old session', 'us')
	session.close()
	assert.equal(calls[2].signal.aborted, true)
	session.open()
	calls[2].result.reject(new Error('late error'))
	await old
	assert.equal(state.error, null)
	assert.equal(state.results, null)
	assert.equal(state.searching, false)
	session.dispose()
})

test('search exposes failures, supports retry, and never updates after disposal', async () => {
	let state!: AppleSearchState
	const pending = deferred<unknown>()
	let calls = 0
	let publications = 0
	const session = createAppleSearch(
		(next) => {
			state = next
			publications++
		},
		async () => {
			if (++calls === 1) throw new Error('provider unavailable')
			return pending.promise
		}
	)
	session.open()
	await session.search('artist', 'us')
	assert.equal(state.error, 'provider unavailable')
	const retry = session.search('artist', 'us')
	assert.equal(state.error, null)
	assert.equal(state.searching, true)
	session.dispose()
	const count = publications
	pending.resolve({ result: 1 })
	await retry
	assert.equal(publications, count)
})

test('cache clears deduplicate active keys and recover independently after failures', async () => {
	const first = deferred<{ deleted: number }>()
	let calls = 0
	let pending = new Set<string>()
	let failures = 0
	const messages: string[] = []
	const session = createDebugCacheSession({
		pending: (keys) => {
			pending = keys
		},
		success: (message) => messages.push(message),
		error: () => {
			failures++
		},
		request: async () => {
			calls++
			return calls === 1 ? first.promise : { deleted: 1 }
		}
	})
	const one = session.clear({ key: 'album' }, 'Album')
	assert.equal(await session.clear({ key: 'album' }, 'Album'), false)
	assert.equal(calls, 1)
	await session.clear({ key: 'other' }, 'Other')
	assert.deepEqual([...pending], ['album'])
	first.reject(new Error('offline'))
	assert.equal(await one, false)
	assert.equal(failures, 1)
	assert.equal(pending.size, 0)
	assert.equal(await session.clear({ key: 'album' }, 'Album'), true)
	assert.deepEqual(messages, ['Other: 1 keys deleted', 'Album: 1 keys deleted'])
	session.dispose()
})

test('debug transport preserves selectors/storefront and rejects malformed cache responses', async (t) => {
	const requests: unknown[] = []
	t.mock.method(globalThis, 'fetch', async (_url: RequestInfo | URL, options?: RequestInit) => {
		requests.push(JSON.parse(String(options?.body)))
		return Response.json(
			requests.length === 1 ? { deleted: 2 } : requests.length === 2 ? {} : { results: [] }
		)
	})
	assert.deepEqual(await clearDebugCache({ pattern: 'apple:album:*' }), { deleted: 2 })
	await assert.rejects(clearDebugCache({ key: 'album' }), /Invalid cache response/)
	assert.deepEqual(await searchAppleMusic('artist', 'jp', new AbortController().signal), {
		results: []
	})
	assert.deepEqual(requests, [
		{ pattern: 'apple:album:*' },
		{ key: 'album' },
		{ query: 'artist', storefront: 'jp' }
	])
})
