import assert from 'node:assert/strict'
import test from 'node:test'
import { createPagedFeed, type FeedState } from '../src/lib/public/paged-feed.ts'

function setup() {
	let state: FeedState<number> = {
		items: [1],
		offset: 1,
		hasMore: true,
		loading: false,
		loadingAll: false,
		error: ''
	}
	const requests: Array<{
		offset: number
		signal: AbortSignal
		resolve: (page: { items: number[]; limit: number; hasMore: boolean }) => void
		reject: (error: Error) => void
	}> = []
	const collection = createPagedFeed({
		initial: state,
		key: (item: number) => item,
		load: (offset, _limit, signal) =>
			new Promise((resolve, reject) => requests.push({ offset, signal, resolve, reject })),
		changed: (next) => {
			state = next
		}
	})
	return {
		collection,
		requests,
		get state() {
			return state
		}
	}
}

test('concurrent pagination shares requests and removes duplicate IDs within and across pages', async () => {
	const s = setup()
	const first = s.collection.loadMore()
	const duplicate = s.collection.loadMore()
	assert.equal(s.requests.length, 1)
	s.requests[0].resolve({ items: [1, 2, 2], limit: 3, hasMore: true })
	await Promise.all([first, duplicate])
	assert.deepEqual(s.state.items, [1, 2])
	assert.equal(s.state.offset, 4)
})

test('load-all preserves successful pages on failure and retry resumes at the failed offset', async () => {
	const s = setup()
	const loading = s.collection.loadAll()
	s.requests[0].resolve({ items: [2], limit: 1, hasMore: true })
	await new Promise((resolve) => setImmediate(resolve))
	s.requests[1].reject(new Error('offline'))
	await loading
	assert.deepEqual(s.state.items, [1, 2])
	assert.equal(s.state.hasMore, true)
	assert.equal(s.state.error, 'offline')
	assert.equal(s.state.loadingAll, false)
	const retry = s.collection.loadAll()
	assert.equal(s.requests[2].offset, 2)
	s.requests[2].resolve({ items: [3], limit: 1, hasMore: false })
	await retry
	assert.deepEqual(s.state.items, [1, 2, 3])
	assert.equal(s.state.error, '')
	assert.equal(s.state.hasMore, false)
})

test('snapshot restoration and teardown invalidate responses even if transport ignores abort', async () => {
	const s = setup()
	const first = s.collection.loadMore()
	s.collection.restore([1, 2, 3], 3)
	assert.equal(s.requests[0].signal.aborted, true)
	s.requests[0].resolve({ items: [9], limit: 1, hasMore: true })
	await first
	assert.deepEqual(s.state.items, [1, 2, 3])
	const second = s.collection.loadMore()
	s.collection.dispose()
	assert.equal(s.requests[1].signal.aborted, true)
	s.requests[1].resolve({ items: [10], limit: 1, hasMore: false })
	await second
	assert.deepEqual(s.state.items, [1, 2, 3])
})
