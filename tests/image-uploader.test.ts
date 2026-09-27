import assert from 'node:assert/strict'
import test from 'node:test'
import type { Media } from '@prisma/client'
import {
	createUploadSession,
	type UploadState
} from '../src/lib/components/admin/image-uploader/upload-session.ts'
import {
	createDescriptionSession,
	type DescriptionState
} from '../src/lib/components/admin/image-uploader/description-session.ts'
import {
	uploadImage,
	saveDescription,
	validateImage,
	type DescriptionUpdate
} from '../src/lib/components/admin/image-uploader/media-requests.ts'

const media = { id: 1, url: '/image.svg', description: 'Initial', updatedAt: new Date() } as Media
const file = new File(['<svg/>'], 'image.svg', { type: 'image/svg+xml' })
const update = (description: string): DescriptionUpdate => ({
	id: 1,
	description,
	updatedAt: new Date()
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
const flush = async () => {
	await Promise.resolve()
	await Promise.resolve()
	await Promise.resolve()
}

test('image validation keeps image MIME and inclusive size limits', () => {
	assert.equal(validateImage(file, file.size / 1024 / 1024), null)
	assert.match(validateImage(file, 0)!, /File size/)
	assert.match(
		validateImage(new File(['text'], 'a.txt', { type: 'text/plain' }), 10)!,
		/image file/
	)
})

test('upload transport sends multipart data and metadata clearing uses a string', async (t) => {
	const signal = new AbortController().signal
	const calls: Array<{ url: unknown; options?: RequestInit }> = []
	t.mock.method(globalThis, 'fetch', async (url: unknown, options?: RequestInit) => {
		calls.push({ url, options })
		return Response.json(media)
	})
	await uploadImage(file, '  Description  ', signal)
	assert.equal(calls[0].url, '/api/media/upload')
	assert.equal(calls[0].options?.credentials, 'same-origin')
	assert.equal(calls[0].options?.signal, signal)
	const body = calls[0].options?.body as FormData
	assert.equal((body.get('file') as File).name, file.name)
	assert.equal(body.get('description'), 'Description')
	assert.equal(calls[0].options?.headers, undefined)
	await saveDescription(1, '   ', signal)
	assert.equal(calls[1].url, '/api/media/1/metadata')
	assert.equal(calls[1].options?.body, '{"description":""}')
	assert.equal(calls[1].options?.signal, signal)
})

test('request failures retain server messages and tolerate non-JSON errors', async (t) => {
	let response = Response.json({ error: { message: 'Too large' } }, { status: 413 })
	t.mock.method(globalThis, 'fetch', async () => response)
	await assert.rejects(uploadImage(file, '', new AbortController().signal), /Too large/)
	response = new Response('<html>Unavailable</html>', { status: 503 })
	await assert.rejects(uploadImage(file, '', new AbortController().signal), /Upload failed/)
	response = new Response('', { status: 500 })
	await assert.rejects(
		saveDescription(1, '', new AbortController().signal),
		/Failed to save description/
	)
})

test('one upload runs at a time and publishes completion once', async (t) => {
	t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] })
	const result = deferred<Media>()
	const states: UploadState[] = []
	const completed: Media[] = []
	let calls = 0
	const session = createUploadSession({
		onState: (state) => states.push(state),
		onComplete: (value) => completed.push(value),
		upload: async () => {
			calls++
			return result.promise
		}
	})
	const work = session.start(file, 10, '')
	await session.start(file, 10, '')
	assert.equal(calls, 1)
	t.mock.timers.tick(10000)
	assert.ok(states.every((state) => state.progress <= 90))
	result.resolve(media)
	await flush()
	assert.equal(states.at(-1)?.progress, 100)
	t.mock.timers.tick(500)
	await work
	assert.deepEqual(completed, [media])
	assert.deepEqual(states.at(-1), { status: 'idle', progress: 0, error: null })
	const count = states.length
	t.mock.timers.tick(10000)
	assert.equal(states.length, count)
})

test('failed uploads release timers, preserve ownership of the old image, and allow retry', async (t) => {
	t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] })
	const states: UploadState[] = []
	let calls = 0
	let selected = media
	const session = createUploadSession({
		onState: (state) => states.push(state),
		onComplete: (value) => {
			selected = value
		},
		upload: async () => {
			calls++
			throw new Error('Offline')
		}
	})
	await session.start(file, 10, '')
	assert.equal(selected, media)
	assert.equal(states.at(-1)?.error, 'Offline')
	const count = states.length
	t.mock.timers.tick(10000)
	assert.equal(states.length, count)
	await session.start(file, 10, '')
	assert.equal(calls, 2)
})

for (const duringDelay of [false, true]) {
	test(`teardown aborts requests and prevents late callbacks ${duringDelay ? 'during completion delay' : 'during network wait'}`, async (t) => {
		t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] })
		const result = deferred<Media>()
		const states: UploadState[] = []
		let signal: AbortSignal | undefined
		let completed = false
		const session = createUploadSession({
			onState: (state) => states.push(state),
			onComplete: () => {
				completed = true
			},
			upload: async (_file, _description, requestSignal) => {
				signal = requestSignal
				return result.promise
			}
		})
		const work = session.start(file, 10, '')
		if (duringDelay) {
			result.resolve(media)
			await flush()
		}
		session.dispose()
		assert.equal(signal?.aborted, true)
		const count = states.length
		result.resolve(media)
		await flush()
		t.mock.timers.tick(10000)
		await work
		assert.equal(completed, false)
		assert.equal(states.length, count)
		await session.start(file, 10, '')
		assert.equal(states.length, count)
	})
}

test('invalid files do not start requests or timers', async () => {
	const states: UploadState[] = []
	const session = createUploadSession({
		onState: (state) => states.push(state),
		onComplete: () => assert.fail('unexpected completion'),
		upload: async () => {
			assert.fail('unexpected upload')
		}
	})
	await session.start(file, 0, '')
	assert.match(states.at(-1)?.error ?? '', /File size/)
})

test('description saves serialize and coalesce queued drafts to the latest text', async () => {
	const requests: Array<{ text: string; result: ReturnType<typeof deferred<DescriptionUpdate>> }> =
		[]
	const saved: DescriptionUpdate[] = []
	const states: DescriptionState[] = []
	const session = createDescriptionSession({
		onState: (state) => states.push(state),
		onSaved: (value) => saved.push(value),
		save: async (_id, text) => {
			const result = deferred<DescriptionUpdate>()
			requests.push({ text, result })
			return result.promise
		}
	})
	session.select(1)
	const work = session.save('First')
	session.save('Intermediate')
	session.save(' Latest ')
	assert.equal(requests.length, 1)
	requests[0].result.resolve(update('First'))
	await flush()
	assert.equal(requests.length, 2)
	assert.equal(requests[1].text, 'Latest')
	requests[1].result.resolve(update('Latest'))
	await work
	assert.equal(saved.at(-1)?.description, 'Latest')
	assert.deepEqual(states.at(-1), { saving: false, error: null })
})

test('failed descriptions remain retryable, including clearing the field', async () => {
	let calls = 0
	const saved: DescriptionUpdate[] = []
	const states: DescriptionState[] = []
	const session = createDescriptionSession({
		onState: (state) => states.push(state),
		onSaved: (value) => {
			saved.push(value)
		},
		save: async (_id, text) => {
			if (++calls === 1) throw new Error('Offline')
			return update(text)
		}
	})
	session.select(1)
	await session.save('My draft')
	assert.equal(saved.length, 0)
	assert.equal(states.at(-1)?.error, 'Offline')
	await session.save('My draft')
	assert.equal(saved.at(-1)?.description, 'My draft')
	await session.save('   ')
	assert.equal(saved.at(-1)?.description, '')
})

for (const dispose of [false, true]) {
	test(`description responses cannot update media after ${dispose ? 'teardown' : 'replacement'}`, async () => {
		const result = deferred<DescriptionUpdate>()
		let signal: AbortSignal | undefined
		const states: DescriptionState[] = []
		const session = createDescriptionSession({
			onState: (state) => states.push(state),
			onSaved: () => assert.fail('stale response'),
			save: async (_id, _text, requestSignal) => {
				signal = requestSignal
				return result.promise
			}
		})
		session.select(1)
		const work = session.save('Old image')
		if (dispose) session.dispose()
		else session.select(2)
		assert.equal(signal?.aborted, true)
		const count = states.length
		result.resolve(update('Old image'))
		await work
		assert.equal(states.length, count)
	})
}
