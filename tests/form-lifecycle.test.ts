import assert from 'node:assert/strict'
import test from 'node:test'
import { createAutoSave } from '../src/lib/components/admin/forms/auto-save.ts'
import { createFormNavigation } from '../src/lib/components/admin/forms/form-navigation.ts'
import {
	acknowledgeField,
	createSaveQueue
} from '../src/lib/components/admin/forms/save-session.ts'
import { albumFormFields, albumPayload } from '../src/lib/components/admin/forms/album-form.ts'

function deferred<T = void>() {
	let resolve!: (value: T) => void
	let reject!: (error: unknown) => void
	const promise = new Promise<T>((yes, no) => {
		resolve = yes
		reject = no
	})
	return { promise, resolve, reject }
}
const settle = async () => {
	for (let index = 0; index < 10; index++) await Promise.resolve()
}

test('autosave shares one request and flush drains edits made during saving', async () => {
	let value = 'first'
	let saved = ''
	const first = deferred()
	const submitted: string[] = []
	const auto = createAutoSave({
		enabled: () => true,
		isDirty: () => value !== saved,
		async save() {
			const snapshot = value
			submitted.push(snapshot)
			if (submitted.length === 1) await first.promise
			saved = snapshot
		}
	})
	const one = auto.flush()
	const two = auto.flush()
	assert.equal(one, two)
	await settle()
	assert.equal(auto.state, 'saving')
	value = 'second'
	first.resolve()
	await one
	assert.deepEqual(submitted, ['first', 'second'])
	assert.equal(auto.state, 'saved')
	auto.dispose()
})

test('background rejection reports failure; explicit retry clears failed state', async (t) => {
	t.mock.timers.enable({ apis: ['setTimeout'] })
	let fail = true
	let dirty = true
	const auto = createAutoSave({
		enabled: () => true,
		isDirty: () => dirty,
		debounceMs: 10,
		async save() {
			if (fail) throw new Error('offline')
			dirty = false
		}
	})
	auto.schedule()
	t.mock.timers.tick(10)
	await settle()
	assert.equal(auto.state, 'failed')
	fail = false
	await auto.flush()
	assert.equal(auto.state, 'saved')
	// A no-op blur/flush must not cancel the saved-flash expiry.
	await auto.flush()
	t.mock.timers.tick(2000)
	assert.equal(auto.state, 'idle')
	auto.dispose()
})

test('conflicts reject all flush callers and never retry silently', async (t) => {
	t.mock.timers.enable({ apis: ['setTimeout'] })
	let count = 0
	const error = Object.assign(new Error('changed remotely'), { status: 409 })
	const auto = createAutoSave({
		enabled: () => true,
		isDirty: () => true,
		async save() {
			count++
			throw error
		}
	})
	await assert.rejects(auto.flush(), error)
	assert.equal(auto.state, 'conflict')
	auto.schedule()
	t.mock.timers.tick(2000)
	await assert.rejects(auto.flush(), error)
	assert.equal(count, 1)
	auto.dispose()
})

test('teardown cancels pending debounce and suppresses follow-up requests and saved timers', async (t) => {
	t.mock.timers.enable({ apis: ['setTimeout'] })
	let count = 0
	const first = deferred()
	const auto = createAutoSave({
		enabled: () => true,
		isDirty: () => true,
		async save() {
			count++
			await first.promise
		}
	})
	auto.schedule()
	auto.dispose()
	t.mock.timers.tick(3000)
	await settle()
	assert.equal(count, 0)
	const active = createAutoSave({
		enabled: () => true,
		isDirty: () => true,
		async save() {
			count++
			await first.promise
		}
	})
	const save = active.flush()
	await settle()
	active.dispose()
	first.resolve()
	await save
	t.mock.timers.tick(10000)
	assert.equal(count, 1)
})

test('synchronous transport failure does not strand the in-flight promise', async () => {
	let fail = true
	let dirty = true
	const auto = createAutoSave({
		enabled: () => true,
		isDirty: () => dirty,
		save() {
			if (fail) throw new Error('sync')
			dirty = false
			return Promise.resolve()
		}
	})
	await assert.rejects(auto.flush(), /sync/)
	fail = false
	await auto.flush()
	assert.equal(auto.state, 'saved')
	auto.dispose()
})

test('navigation waits for edits, retains full URL, and restores guards after goto failure', async () => {
	let dirty = true
	let modal = false
	const urls: string[] = []
	const navigation = createFormNavigation({
		isDirty: () => dirty,
		canAutoSave: () => true,
		flush: async () => {
			dirty = false
		},
		goto: async (url) => {
			urls.push(url)
			assert.equal(navigation.allows(url), true)
			throw new Error('routing failed')
		},
		prompt: (open) => {
			modal = open
		}
	})
	await navigation.request('/admin/posts?status=draft#list')
	assert.deepEqual(urls, ['/admin/posts?status=draft#list'])
	assert.equal(modal, true)
	assert.equal(navigation.allows(urls[0]), false)
	dirty = true
	await navigation.leave()
	assert.equal(modal, true)
	assert.equal(dirty, true)
	navigation.continueEditing()
	assert.equal(modal, false)
})

test('disabled autosave and still-dirty flushes cannot discard edits', async () => {
	let enabled = false
	let navigated = false
	let modal = false
	const navigation = createFormNavigation({
		isDirty: () => true,
		canAutoSave: () => enabled,
		flush: async () => {},
		goto: async () => {
			navigated = true
		},
		prompt: (open) => {
			modal = open
		}
	})
	await navigation.request('/other')
	assert.equal(modal, true)
	navigation.continueEditing()
	enabled = true
	await navigation.request('/other')
	assert.equal(modal, true)
	assert.equal(navigated, false)
})

test('continue editing and disposal cancel navigation waiting on a save', async () => {
	const save = deferred()
	let navigated = false
	const navigation = createFormNavigation({
		isDirty: () => false,
		canAutoSave: () => true,
		flush: () => save.promise,
		goto: async () => {
			navigated = true
		},
		prompt: () => {}
	})
	const request = navigation.request('/other')
	navigation.continueEditing()
	save.resolve()
	await request
	assert.equal(navigated, false)
	navigation.dispose()
	await navigation.request('/another')
	assert.equal(navigated, false)
})

test('save queue serializes first creation and recovers after rejection', async () => {
	const queue = createSaveQueue()
	const create = deferred<number>()
	let id: number | null = null
	const requests: string[] = []
	const first = queue.run(async () => {
		requests.push('POST')
		id = await create.promise
	})
	const second = queue.run(async () => {
		requests.push(`PUT ${id}`)
		throw new Error('failed update')
	})
	const failure = assert.rejects(second, /failed update/)
	await settle()
	assert.deepEqual(requests, ['POST'])
	create.resolve(7)
	await first
	await failure
	await queue.run(async () => {
		requests.push(`PUT ${id}`)
	})
	assert.deepEqual(requests, ['POST', 'PUT 7', 'PUT 7'])
})

test('canonical first-save values do not overwrite edits made during the request', () => {
	assert.equal(acknowledgeField('', '', 'server-slug'), 'server-slug')
	assert.equal(acknowledgeField('edited', '', 'server-slug'), 'edited')
	assert.equal(acknowledgeField('draft', 'draft', 'published'), 'published')
	assert.deepEqual(
		acknowledgeField({ source: 'new' }, { source: 'old' }, { source: 'canonical' }),
		{ source: 'new' }
	)
})

test('album payload preserves persisted fields without replacing live edits', () => {
	const fields = albumFormFields(null)
	fields.title = 'Submitted'
	fields.year = '2023-2025'
	const payload = albumPayload(fields)
	fields.title = 'Edited while saving'
	assert.equal(payload.title, 'Submitted')
	assert.equal(payload.date, '2023-2025')
	assert.equal(fields.title, 'Edited while saving')
	assert.deepEqual(payload.content, { type: 'doc', content: [{ type: 'paragraph' }] })
})

test('a successful manual save allows autosave to schedule subsequent edits after a failure', async (t) => {
	t.mock.timers.enable({ apis: ['setTimeout'] })
	let dirty = true
	let fail = true
	let requests = 0
	const auto = createAutoSave({
		enabled: () => true,
		isDirty: () => dirty,
		debounceMs: 10,
		async save() {
			requests++
			if (fail) throw new Error('offline')
			dirty = false
		}
	})
	await assert.rejects(auto.flush(), /offline/)
	// The form acknowledges a successful explicit save separately from the autosave engine.
	dirty = false
	auto.schedule()
	assert.equal(auto.state, 'idle')
	fail = false
	dirty = true
	auto.schedule()
	t.mock.timers.tick(10)
	await settle()
	assert.equal(requests, 2)
	assert.equal(auto.state, 'saved')
	auto.dispose()
})

test('queued autosave rechecks eligibility after an explicit publish finishes', async () => {
	const queue = createSaveQueue()
	const published = deferred()
	let status = 'draft'
	let dirty = true
	const requests: string[] = []
	const publish = queue.run(async () => {
		requests.push('published')
		await published.promise
		status = 'published'
	})
	const auto = createAutoSave({
		enabled: () => status === 'draft',
		isDirty: () => dirty,
		save: () =>
			queue.runIf(
				() => status === 'draft',
				async () => {
					requests.push(status)
					dirty = false
				}
			)
	})
	const pending = auto.flush()
	await settle()
	assert.deepEqual(requests, ['published'])
	published.resolve()
	await Promise.all([publish, pending])
	assert.equal(status, 'published')
	assert.equal(
		dirty,
		true,
		'edits not submitted by publishing remain dirty for navigation protection'
	)
	assert.deepEqual(
		requests,
		['published'],
		'background save must not revert published content to draft'
	)
	auto.dispose()
})

test('failed navigation after deletion leaves a usable retry destination', async () => {
	let attempts = 0
	let modal = false
	const urls: string[] = []
	const navigation = createFormNavigation({
		isDirty: () => true,
		canAutoSave: () => false,
		flush: async () => {},
		goto: async (url) => {
			urls.push(url)
			if (++attempts === 1) throw new Error('routing failed')
		},
		prompt: (open) => {
			modal = open
		}
	})
	await navigation.navigateAfterDelete('/admin/posts?status=draft')
	assert.equal(modal, true)
	await navigation.leave()
	assert.deepEqual(urls, ['/admin/posts?status=draft', '/admin/posts?status=draft'])
	assert.equal(modal, false)
})
