import assert from 'node:assert/strict'
import { test } from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'
import { createSuggestionSearch, type SuggestionState } from '../src/lib/admin/suggestions'
import { createCollectionSession } from '../src/lib/admin/collection'
function deferred<T>() {
	let resolve!: (value: T) => void
	let reject!: (error: Error) => void
	const promise = new Promise<T>((yes, no) => {
		resolve = yes
		reject = no
	})
	return { promise, resolve, reject }
}
test('suggestions invalidate running requests immediately on query change, clear and teardown', async () => {
	const old = deferred<string[]>()
	const next = deferred<string[]>()
	let state: SuggestionState<string> | undefined
	const search = createSuggestionSearch(
		(query) => (query === 'old' ? old.promise : next.promise),
		(value) => {
			state = value
		},
		0
	)
	search.query('old')
	await delay(5)
	search.query('new')
	old.resolve(['stale'])
	await delay(5)
	assert.deepEqual(state?.results, [])
	next.resolve(['current'])
	await delay(0)
	assert.deepEqual(state?.results, ['current'])
	search.query('x')
	assert.deepEqual(state?.results, [])
	assert.equal(state?.loading, false)
	search.query('canceled')
	search.dispose()
	await delay(5)
	assert.deepEqual(state?.results, [])
})

test('suggestion failures clear loading and recover on subsequent queries', async () => {
	let fail = true
	let state: SuggestionState<string> | undefined
	const search = createSuggestionSearch(
		async () => {
			if (fail) throw new Error('provider unavailable')
			return ['recovered']
		},
		(value) => {
			state = value
		},
		0
	)
	search.query('query')
	await delay(5)
	assert.equal(state?.loading, false)
	assert.equal(state?.error, 'provider unavailable')
	fail = false
	search.query('query')
	await delay(5)
	assert.deepEqual(state?.results, ['recovered'])
	search.dispose()
})

test('collection keeps newer results, retains successful content on failure, and deduplicates mutations', async () => {
	let items: number[] = []
	let error = ''
	const collection = createCollectionSession<number>((next, _loading, message) => {
		items = next
		error = message
	})
	const first = deferred<number[]>()
	const pending = collection.load(() => first.promise)
	await collection.load(async () => [2])
	first.resolve([1])
	await pending
	assert.deepEqual(items, [2])
	await collection.load(async () => {
		throw new Error('offline')
	})
	assert.deepEqual(items, [2])
	assert.equal(error, 'offline')
	const operation = deferred<void>()
	const mutation = collection.mutate(1, () => operation.promise)
	assert.equal(await collection.mutate(1, async () => assert.fail('duplicate')), false)
	operation.resolve()
	assert.equal(await mutation, true)
	collection.dispose()
	assert.equal(await collection.mutate(1, async () => assert.fail('disposed')), false)
})

test('collection teardown cancels requests and ignores late load and mutation responses', async () => {
	let calls = 0
	let signal: AbortSignal | undefined
	const collection = createCollectionSession<number>(() => {
		calls++
	})
	const request = deferred<number[]>()
	const loading = collection.load((value) => {
		signal = value
		return request.promise
	})
	const mutationRequest = deferred<void>()
	const mutation = collection.mutate(1, () => mutationRequest.promise)
	collection.dispose()
	assert.equal(signal?.aborted, true)
	request.resolve([1])
	mutationRequest.resolve()
	await loading
	assert.equal(await mutation, false)
	assert.equal(calls, 1)
})

test('clickOutside does not attach a delayed listener after destroy or disable', async (t) => {
	const { clickOutside } = await import('../src/lib/actions/clickOutside')
	t.mock.timers.enable({ apis: ['setTimeout'] })
	let listeners = 0
	const previous = globalThis.document
	Object.defineProperty(globalThis, 'document', {
		configurable: true,
		value: {
			addEventListener() {
				listeners++
			},
			removeEventListener() {
				listeners = 0
			}
		}
	})
	try {
		const element = { contains: () => false, dispatchEvent: () => true } as unknown as HTMLElement
		const action = clickOutside(element)
		action.destroy()
		t.mock.timers.tick(0)
		assert.equal(listeners, 0)
		const second = clickOutside(element)
		second.update({ enabled: false })
		t.mock.timers.tick(0)
		assert.equal(listeners, 0)
		second.update({ enabled: true })
		t.mock.timers.tick(0)
		assert.equal(listeners, 1)
		second.destroy()
		assert.equal(listeners, 0)
	} finally {
		Object.defineProperty(globalThis, 'document', { configurable: true, value: previous })
	}
})
