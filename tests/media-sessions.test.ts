import assert from 'node:assert/strict'
import test from 'node:test'
import type { Media } from '@prisma/client'
import { createLibrarySession, emptyLibrary } from '../src/lib/admin/media/library-session.ts'
import { createMembershipSession } from '../src/lib/admin/media/membership-session.ts'
import { createDetailsSession, emptyDetails } from '../src/lib/admin/media/details-session.ts'
import { loadMediaPage, loadAlbums, type MediaPage } from '../src/lib/admin/media/requests.ts'
import { responseData } from '../src/lib/admin/response.ts'
const item = (id: number) =>
	({ id, mimeType: 'image/png', isPhotography: true, description: '' }) as Media
const filters = { type: 'all', photography: 'all', search: '' }
const result = (id: number, totalPages = 2): MediaPage => ({
	media: [item(id)],
	pagination: { totalPages }
})
function deferred<T>() {
	let resolve!: (value: T) => void
	let reject!: (cause: unknown) => void
	const promise = new Promise<T>((yes, no) => {
		resolve = yes
		reject = no
	})
	return { promise, resolve, reject }
}
const tick = async () => {
	for (let i = 0; i < 8; i++) await Promise.resolve()
}

test('media filtering cancels old requests and ignores late responses', async (t) => {
	t.mock.timers.enable({ apis: ['setTimeout'] })
	let state = emptyLibrary()
	const first = deferred<MediaPage>(),
		second = deferred<MediaPage>()
	const signals: AbortSignal[] = []
	const session = createLibrarySession({
		onChange: (next) => (state = next),
		load: (_f, _p, signal) => {
			signals.push(signal)
			return signals.length === 1 ? first.promise : second.promise
		}
	})
	session.open([])
	session.search(filters)
	t.mock.timers.tick(0)
	session.search({ ...filters, search: 'new' })
	t.mock.timers.tick(0)
	assert.equal(signals[0].aborted, true)
	second.resolve(result(2))
	await tick()
	first.resolve(result(1))
	await tick()
	assert.deepEqual(
		state.media.map((m) => m.id),
		[2]
	)
	session.close()
})

test('selection survives pagination and filtering; repeated page loads are serialized', async (t) => {
	t.mock.timers.enable({ apis: ['setTimeout'] })
	let state = emptyLibrary(),
		calls = 0
	const session = createLibrarySession({
		onChange: (next) => (state = next),
		load: async () => result(++calls)
	})
	session.open([])
	session.search(filters)
	t.mock.timers.tick(0)
	await tick()
	session.toggle(state.media[0], false)
	await Promise.all([session.more(), session.more()])
	assert.equal(calls, 2)
	session.toggle(state.media[1], false)
	session.search({ ...filters, search: 'different' })
	t.mock.timers.tick(0)
	await tick()
	assert.deepEqual(
		(await session.selected())?.map((m) => m.id),
		[1, 2]
	)
	session.close()
})

test('initial selections outside the current page hydrate and single selection replaces them', async (t) => {
	t.mock.timers.enable({ apis: ['setTimeout'] })
	const session = createLibrarySession({ onChange: () => {}, get: async (id) => item(id) })
	session.open([99])
	assert.deepEqual(
		(await session.selected())?.map((m) => m.id),
		[99]
	)
	session.toggle(item(2), true)
	assert.deepEqual(
		(await session.selected())?.map((m) => m.id),
		[2]
	)
	session.close()
})

test('closing cancels debounce and reopening rejects pending selection hydration', async (t) => {
	t.mock.timers.enable({ apis: ['setTimeout'] })
	let calls = 0
	const pending = deferred<Media>()
	const session = createLibrarySession({
		onChange: () => {},
		load: async () => {
			calls++
			return result(1)
		},
		get: () => pending.promise
	})
	session.open([1])
	session.search(filters, 300)
	const selection = session.selected()
	session.close()
	session.open([2])
	t.mock.timers.tick(400)
	pending.resolve(item(1))
	assert.equal(await selection, null)
	assert.equal(calls, 0)
	session.close()
})

test('first-page failures can retry and cancelled failures do not publish errors', async (t) => {
	t.mock.timers.enable({ apis: ['setTimeout'] })
	let state = emptyLibrary(),
		calls = 0
	const session = createLibrarySession({
		onChange: (next) => (state = next),
		load: async () => {
			if (++calls === 1) throw new Error('Unavailable')
			return result(2)
		}
	})
	session.open([])
	session.search(filters)
	t.mock.timers.tick(0)
	await tick()
	assert.equal(state.error, 'Unavailable')
	assert.equal(state.loading, false)
	await session.more()
	assert.equal(state.error, '')
	assert.equal(state.media[0].id, 2)
	session.close()
})

test('membership partial failure advances successes and retries only failed work', async () => {
	const calls: number[] = []
	let fail = true
	const session = createMembershipSession([1], async (id) => {
		calls.push(id)
		if (id === 3 && fail) throw new Error('Unavailable')
	})
	await assert.rejects(session.save([2, 3]), /Unavailable/)
	fail = false
	assert.equal(await session.save([2, 3]), true)
	assert.deepEqual(calls, [1, 2, 3, 3])
	session.close()
})

test('membership ignores duplicate submissions and teardown stops remaining mutations', async () => {
	const pending = deferred<void>()
	const calls: number[] = []
	const session = createMembershipSession([], async (id) => {
		calls.push(id)
		await pending.promise
	})
	const saving = session.save([1, 2])
	assert.equal(await session.save([1, 2]), false)
	session.close()
	pending.resolve()
	assert.equal(await saving, false)
	assert.deepEqual(calls, [1])
})

test('details ignore replaced media loads and clear unrelated albums/hearts', async () => {
	let state = emptyDetails()
	const pending = deferred<unknown>()
	const session = createDetailsSession({
		onChange: (next) => (state = next),
		onSaved: () => {},
		onClose: () => {},
		getDraft: () => ({ description: '', isPhotography: false }),
		request: <T>() => pending.promise as Promise<T>
	})
	session.select(item(1))
	session.select({ ...item(2), mimeType: 'audio/mp3', isPhotography: false })
	pending.resolve({ usage: [], albums: [{ id: 1 }], heart: 9 })
	await tick()
	assert.deepEqual(state.albums, [])
	assert.equal(state.heartCount, undefined)
	session.close()
})

test('details save timer does not close a replacement or discard edits after saving', async (t) => {
	t.mock.timers.enable({ apis: ['setTimeout'] })
	let closes = 0,
		draft = { description: '', isPhotography: true }
	const session = createDetailsSession({
		onChange: () => {},
		onSaved: () => {},
		onClose: () => closes++,
		getDraft: () => draft,
		request: async <T>() => ({ ...item(1), usage: [], albums: [] }) as T
	})
	session.select(item(1))
	await session.save(draft)
	draft = { ...draft, description: 'New edit' }
	t.mock.timers.tick(1500)
	assert.equal(closes, 0)
	await session.save(draft)
	session.select(item(2))
	t.mock.timers.tick(1500)
	assert.equal(closes, 0)
	await session.save(draft)
	session.close()
	t.mock.timers.tick(1500)
	assert.equal(closes, 0)
})

test('shared response parsing preserves status and server messages for retry/conflict handling', async () => {
	await assert.rejects(
		responseData(Response.json({ error: { message: 'Conflict' } }, { status: 409 })),
		{ message: 'Conflict', status: 409 }
	)
	await assert.rejects(responseData(new Response('Bad gateway', { status: 502 })), {
		message: 'Request failed',
		status: 502
	})
	assert.equal(await responseData(new Response(null, { status: 204 })), undefined)
})

test('media transport encodes filters and album listing visits every page', async (t) => {
	const urls: string[] = []
	t.mock.method(globalThis, 'fetch', async (url: string) => {
		urls.push(url)
		if (url.startsWith('/api/media?')) return Response.json(result(1))
		return Response.json({ albums: [{ id: urls.length }], pagination: { total: 2, limit: 1 } })
	})
	const signal = new AbortController().signal
	await loadMediaPage(
		{ type: 'image', photography: 'true', search: 'A & B', albumId: 2 },
		3,
		signal
	)
	assert.equal(new URL(urls[0], 'http://test').searchParams.get('search'), 'A & B')
	assert.equal((await loadAlbums(signal)).length, 2)
	assert.match(urls[2], /offset=1/)
})
