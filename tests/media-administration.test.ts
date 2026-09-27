import assert from 'node:assert/strict'
import test from 'node:test'
import type { Media } from '@prisma/client'
import { createUploadQueue, emptyUploadQueue } from '../src/lib/admin/media/upload-queue.ts'
import { createFilePreviews } from '../src/lib/admin/media/file-previews.ts'
import { runMediaBatch } from '../src/lib/admin/media/bulk-operation.ts'
const file = () => new File(['image'], 'same.png', { type: 'image/png' })
function deferred<T>() {
	let resolve!: (value: T) => void
	const promise = new Promise<T>((yes) => {
		resolve = yes
	})
	return { promise, resolve }
}

test('upload queue distinguishes duplicate filenames and only retries failures', async () => {
	const first = file(),
		second = file(),
		calls: File[] = []
	let fail = true,
		snapshot = emptyUploadQueue()
	const queue = createUploadQueue({
		onChange: (next) => (snapshot = next),
		upload: async (file) => {
			calls.push(file)
			if (file === second && fail) throw new Error('Unavailable')
			return { id: calls.length } as Media
		}
	})
	queue.add([first, second])
	assert.equal(await queue.run(), false)
	assert.equal(snapshot.entries[0].status, 'complete')
	assert.equal(snapshot.entries[1].status, 'failed')
	fail = false
	assert.equal(await queue.run(), true)
	assert.deepEqual(calls, [first, second, second])
	assert.equal(await queue.run(), true)
	assert.equal(calls.length, 3)
	queue.dispose()
})

test('upload queue blocks concurrent submits and stops queued uploads on teardown', async () => {
	let calls = 0,
		publications = 0
	const pending = deferred<Media>()
	const queue = createUploadQueue({
		onChange: () => publications++,
		upload: () => {
			calls++
			return pending.promise
		}
	})
	queue.add([file(), file()])
	const running = queue.run()
	assert.equal(await queue.run(), false)
	queue.dispose()
	const before = publications
	pending.resolve({ id: 1 } as Media)
	assert.equal(await running, false)
	assert.equal(calls, 1)
	assert.equal(publications, before)
})

test('removing a file preserves another file with the same filename', () => {
	let snapshot = emptyUploadQueue()
	const queue = createUploadQueue({ onChange: (next) => (snapshot = next) })
	const first = file(),
		second = file()
	queue.add([first, second])
	queue.remove(first)
	assert.deepEqual(
		snapshot.entries.map((entry) => entry.file),
		[second]
	)
	queue.add([new File(['text'], 'a.txt', { type: 'text/plain' })])
	assert.equal(snapshot.errors.length, 1)
	assert.equal(snapshot.entries.length, 1)
	queue.dispose()
})

test('preview URLs are stable, released on removal, and fully cleaned up on teardown', () => {
	const created: string[] = [],
		revoked: string[] = []
	const resources = createFilePreviews({
		createObjectURL: () => {
			const url = `blob:${created.length}`
			created.push(url)
			return url
		},
		revokeObjectURL: (url) => revoked.push(url)
	})
	const first = file(),
		second = file()
	const a = resources.update([first, second])
	assert.deepEqual(resources.update([first, second]), a)
	assert.equal(created.length, 2)
	resources.update([second])
	assert.deepEqual(revoked, [a[0].url])
	resources.dispose()
	assert.deepEqual(revoked, [a[0].url, a[1].url])
	resources.dispose()
	assert.equal(revoked.length, 2)
})

test('bulk operations preserve successful work and continue independent items after failure', async () => {
	const result = await runMediaBatch(
		[1, 2, 3],
		async (id) => {
			if (id === 2) throw new Error('Conflict')
		},
		new AbortController().signal
	)
	assert.deepEqual(result.succeeded, [1, 3])
	assert.deepEqual(result.failed, [{ item: 2, message: 'Conflict' }])
})

test('bulk operation teardown prevents remaining mutations', async () => {
	const controller = new AbortController(),
		calls: number[] = []
	const result = await runMediaBatch(
		[1, 2],
		async (id) => {
			calls.push(id)
			controller.abort()
		},
		controller.signal
	)
	assert.deepEqual(calls, [1])
	assert.deepEqual(result.succeeded, [1])
})

test('upload queue ignores the same File object twice without merging equal filenames', async () => {
	let snapshot = emptyUploadQueue()
	const queue = createUploadQueue({ onChange: (value) => (snapshot = value) })
	const first = file()
	queue.add([first, first, file()])
	assert.equal(snapshot.entries.length, 2)
	queue.dispose()
})
