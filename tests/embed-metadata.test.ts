import assert from 'node:assert/strict'
import test from 'node:test'
import {
	createEmbedMetadataSession,
	type EmbedMetadata,
	type MetadataStatus
} from '../src/lib/editor/jedmund/headless/components/embed-metadata.ts'

function setup() {
	const requests: Array<{
		signal: AbortSignal
		resolve: (value: EmbedMetadata) => void
		reject: (error: Error) => void
	}> = []
	const applied: string[] = []
	const statuses: MetadataStatus[] = []
	const session = createEmbedMetadataSession({
		load: (_url, signal) =>
			new Promise((resolve, reject) => {
				requests.push({ signal, resolve, reject })
			}),
		apply: (url) => {
			applied.push(url)
		},
		status: (status) => {
			statuses.push(status)
		}
	})
	return { session, requests, applied, statuses }
}

test('replacement aborts old metadata and late responses cannot overwrite the latest URL', async () => {
	const state = setup()
	const first = state.session.refresh('first')
	const second = state.session.refresh('second')
	assert.equal(state.requests[0].signal.aborted, true)
	state.requests[1].resolve({ title: 'New' })
	await second
	state.requests[0].resolve({ title: 'Old' })
	await first
	assert.deepEqual(state.applied, ['second'])
	assert.deepEqual(state.statuses, ['loading', 'loading', 'idle'])
})

test('metadata failure is handled, retry succeeds, and teardown prevents subsequent changes', async () => {
	const state = setup()
	const first = state.session.refresh('first')
	state.requests[0].reject(new Error('offline'))
	await first
	assert.equal(state.statuses.at(-1), 'error')
	const retry = state.session.refresh('first')
	state.requests[1].resolve({ title: 'Recovered' })
	await retry
	assert.deepEqual(state.applied, ['first'])
	const pending = state.session.refresh('third')
	state.session.dispose()
	assert.equal(state.requests[2].signal.aborted, true)
	state.requests[2].resolve({ title: 'Late' })
	await pending
	await state.session.refresh('fourth')
	assert.deepEqual(state.applied, ['first'])
	assert.equal(state.requests.length, 3)
})
