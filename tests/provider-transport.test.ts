import assert from 'node:assert/strict'
import test from 'node:test'
import { createAppleMusicRequest } from '../src/lib/server/apple-music-request.ts'

function setup(response: () => Response) {
	const delays: number[] = []
	const calls: RequestInit[] = []
	const successes: string[] = []
	const failures: Array<[string, boolean]> = []
	let blocked = false
	const request = createAppleMusicRequest({
		headers: async () => ({ Authorization: 'Bearer synthetic' }),
		limiter: {
			shouldBlock: async () => blocked,
			recordSuccess: async (id) => {
				successes.push(id)
			},
			recordFailure: async (id, throttled) => {
				failures.push([id, throttled])
			}
		},
		now: () => 1000,
		wait: async (ms) => {
			delays.push(ms)
		},
		fetch: async (_url, options) => {
			calls.push(options!)
			return response()
		}
	})
	return {
		request,
		calls,
		delays,
		successes,
		failures,
		block: () => {
			blocked = true
		}
	}
}

test('provider requests reserve distinct slots and carry authentication under concurrency', async () => {
	const state = setup(() => Response.json({ data: [] }))
	await Promise.all([
		state.request('/albums/a', 'a'),
		state.request('/albums/b', 'b'),
		state.request('/albums/c', 'c')
	])
	assert.deepEqual(state.delays, [200, 400])
	assert.equal(state.calls.length, 3)
	assert.deepEqual(state.calls[0].headers, { Authorization: 'Bearer synthetic' })
	assert.deepEqual(state.successes.sort(), ['a', 'b', 'c'])
})

test('cached failure blocks transport and throttling records provider backoff', async () => {
	const state = setup(() => new Response('rate limit', { status: 429 }))
	await assert.rejects(state.request('/albums/a', 'a'), /HTTP 429/)
	assert.deepEqual(state.failures, [['a', true]])
	state.block()
	await assert.rejects(state.request('/albums/a', 'a'), /blocked/)
	assert.equal(state.calls.length, 1)
})

test('malformed successes are rejected before clearing failure cache and transport recovers', async () => {
	let valid = false
	const state = setup(() => Response.json(valid ? { results: { albums: { data: [] } } } : null))
	await assert.rejects(state.request('/search', 'search'), /Malformed/)
	assert.deepEqual(state.successes, [])
	valid = true
	assert.deepEqual(await state.request('/search', 'search'), { results: { albums: { data: [] } } })
	assert.deepEqual(state.successes, ['search'])
})
