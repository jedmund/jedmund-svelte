import assert from 'node:assert/strict'
import test from 'node:test'
import { createUploadCompletion } from '../src/lib/admin/media/upload-completion'
import { createAlbumSession, emptyAlbums } from '../src/lib/admin/media/album-session'
import type { AlbumSummary } from '../src/lib/admin/media/requests'

function deferred<T>() {
	let resolve!: (value: T) => void
	let reject!: (error: Error) => void
	const promise = new Promise<T>((yes, no) => {
		resolve = yes
		reject = no
	})
	return { promise, resolve, reject }
}
const settle = async () => {
	for (let n = 0; n < 8; n++) await Promise.resolve()
}

test('upload refresh cannot close a changed queue or report errors into a reopened modal', async (t) => {
	t.mock.timers.enable({ apis: ['setTimeout'] })
	let closed = 0
	let errors = 0
	const completion = createUploadCompletion()
	const first = deferred<void>()
	completion.schedule(
		() => first.promise,
		() => {
			closed++
		},
		() => {
			errors++
		}
	)
	t.mock.timers.tick(1500)
	completion.cancel()
	first.resolve()
	await settle()
	assert.equal(closed, 0)
	const second = deferred<void>()
	completion.schedule(
		() => second.promise,
		() => {
			closed++
		},
		() => {
			errors++
		}
	)
	t.mock.timers.tick(1500)
	completion.cancel()
	second.reject(new Error('stale refresh failed'))
	await settle()
	assert.equal(errors, 0)
	completion.schedule(
		async () => {},
		() => {
			closed++
		},
		() => {
			errors++
		}
	)
	t.mock.timers.tick(1500)
	await settle()
	assert.equal(closed, 1)
})

test('late album listing retains an album created while the initial load was pending', async () => {
	let state = emptyAlbums()
	const initial = deferred<AlbumSummary[]>()
	const created = { id: 2, title: 'New', slug: 'new' }
	const session = createAlbumSession({
		onChange: (next) => {
			state = next
		},
		load: () => initial.promise,
		create: async () => created,
		change: async () => ({})
	})
	const loading = session.open(10, [])
	assert.equal(await session.create('New', 'new'), true)
	initial.resolve([{ id: 1, title: 'Existing', slug: 'existing' }])
	await loading
	assert.deepEqual(
		state.albums.map((album) => album.id),
		[2, 1]
	)
	assert.equal(state.selected.has(2), true)
	assert.deepEqual(await session.save(), [created])
	session.close()
})

test('album save awaits callback, prevents duplicate save, and retries callback without repeating membership writes', async () => {
	let state = emptyAlbums()
	let mutations = 0
	const callback = deferred<void>()
	const session = createAlbumSession({
		onChange: (next) => {
			state = next
		},
		load: async () => [{ id: 1, title: 'Album', slug: 'album' }],
		change: async () => {
			mutations++
			return {}
		}
	})
	await session.open(10, [])
	session.toggle(1)
	const saving = session.save(() => callback.promise)
	await settle()
	assert.equal(state.saving, true)
	assert.equal(await session.save(), null)
	callback.reject(new Error('refresh failed'))
	assert.equal(await saving, null)
	assert.equal(state.error, 'refresh failed')
	assert.deepEqual(
		(await session.save(async () => {}))?.map((album) => album.id),
		[1]
	)
	assert.equal(mutations, 1)
	session.close()
})
