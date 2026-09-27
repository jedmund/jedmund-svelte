import assert from 'node:assert/strict'
import { test } from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'
import {
	createComposerSubmission,
	composerPayload,
	type ComposerDraft
} from '../src/lib/admin/composer-submission'
import {
	createSyndicationSession,
	type SyndicationState
} from '../src/lib/admin/syndication/session'
import type { SyndicationRecord } from '../src/lib/admin/syndication/requests'

function deferred<T>() {
	let resolve!: (value: T) => void
	let reject!: (error: Error) => void
	const promise = new Promise<T>((yes, no) => {
		resolve = yes
		reject = no
	})
	return { promise, resolve, reject }
}
const draft = (): ComposerDraft => ({
	postType: 'essay',
	content: { type: 'doc', content: [] },
	photoIds: [1],
	title: 'Essay',
	slug: 'essay',
	excerpt: '',
	tags: 'one, two'
})
const record = (id: number, platform = 'bluesky'): SyndicationRecord => ({
	id,
	platform,
	status: 'manual',
	externalUrl: 'https://example.com',
	errorMessage: null,
	createdAt: ''
})

test('composer snapshots payload, preserves edits made during saving, and keeps submitted type', async () => {
	let current = draft()
	const request = deferred<void>()
	let sent: ReturnType<typeof composerPayload> | undefined
	const session = createComposerSubmission(async (payload) => {
		sent = payload
		await request.promise
	})
	const saving = session.save(current, () => current)
	assert.equal(await session.save(current, () => current), undefined)
	current = { ...current, title: 'Edited during saving', postType: 'post' }
	request.resolve()
	assert.deepEqual(await saving, { postType: 'essay', unchanged: false })
	assert.equal(sent?.type, 'essay')
	assert.equal('title' in sent! && sent.title, 'Essay')
})

test('composer rejection permits retry and cancellation suppresses stale completion', async () => {
	const current = draft()
	let fail = true
	const request = deferred<void>()
	const session = createComposerSubmission(async () => {
		if (fail) throw new Error('failed')
		await request.promise
	})
	await assert.rejects(
		session.save(current, () => current),
		/failed/
	)
	fail = false
	const pending = session.save(current, () => current)
	session.cancel()
	request.resolve()
	assert.equal(await pending, undefined)
	assert.deepEqual(await session.save(current, () => current), {
		postType: 'essay',
		unchanged: true
	})
})

test('syndication mutations invalidate stale status reads and failed edits retain current records', async () => {
	const status = deferred<SyndicationRecord[]>()
	let state: SyndicationState | undefined
	let fail = false
	const session = createSyndicationSession(
		{
			status: () => status.promise,
			trigger: async () => [record(2)],
			save: async () => {
				if (fail) throw new Error('invalid link')
				return record(3)
			}
		},
		(next) => {
			state = next
		}
	)
	session.setTarget({ contentType: 'post', contentId: 1 })
	assert.equal(await session.trigger(), true)
	status.resolve([record(1)])
	await delay(0)
	assert.equal(state?.records[0].id, 2)
	fail = true
	assert.equal(await session.save('bluesky', 'bad', 2), false)
	assert.equal(state?.records[0].id, 2)
	assert.equal(state?.error, 'invalid link')
	fail = false
	assert.equal(await session.save('bluesky', 'https://example.com', 2), true)
	assert.deepEqual(
		state?.records.map((item) => item.id),
		[3]
	)
	session.dispose()
})

test('syndication target switch and teardown discard prior work and duplicate save calls', async () => {
	const pending = deferred<SyndicationRecord>()
	let state: SyndicationState | undefined
	const session = createSyndicationSession(
		{ status: async () => [], trigger: async () => [], save: () => pending.promise },
		(next) => {
			state = next
		}
	)
	session.setTarget({ contentType: 'post', contentId: 1 })
	await delay(0)
	const save = session.save('bluesky', 'https://example.com')
	assert.equal(await session.save('bluesky', 'https://duplicate.example.com'), false)
	session.setTarget({ contentType: 'album', contentId: 2 })
	pending.resolve(record(1))
	assert.equal(await save, false)
	assert.deepEqual(state?.records, [])
	session.dispose()
	assert.equal(await session.trigger(), false)
})

test('upload completion replaces only its relocated placeholder; failure never undoes later text', async () => {
	const { Schema } = await import('@tiptap/pm/model')
	const { replaceUploadPlaceholder } = await import(
		'../src/lib/components/admin/composer/image-placeholder'
	)
	const schema = new Schema({
		nodes: {
			doc: { content: 'block*' },
			text: { group: 'inline' },
			paragraph: { group: 'block', content: 'inline*' },
			image: { group: 'block', attrs: { src: {} } }
		}
	})
	const doc = schema.node('doc', null, [
		schema.node('paragraph', null, schema.text('newer text')),
		schema.node('image', { src: 'blob:owned' }),
		schema.node('image', { src: 'blob:other' })
	])
	const calls: unknown[] = []
	const editor = {
		isDestroyed: false,
		state: { doc },
		commands: {
			insertContentAt: (range: unknown, replacement: unknown, options: unknown) => {
				calls.push([range, replacement, options])
				return true
			},
			deleteRange: (range: unknown) => {
				calls.push(range)
				return true
			}
		}
	} as unknown as import('@tiptap/core').Editor
	assert.equal(
		replaceUploadPlaceholder(editor, 'blob:owned', { type: 'image', attrs: { src: '/saved.jpg' } }),
		true
	)
	assert.deepEqual(calls[0], [
		{ from: 12, to: 13 },
		{ type: 'image', attrs: { src: '/saved.jpg' } },
		{ updateSelection: false }
	])
	assert.equal(replaceUploadPlaceholder(editor, 'blob:owned'), true)
	assert.deepEqual(calls[1], { from: 12, to: 13 })
	assert.equal(replaceUploadPlaceholder(editor, 'blob:removed'), false)
	assert.equal(calls.length, 2)
})
