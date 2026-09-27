import assert from 'node:assert/strict'
import test from 'node:test'
import {
	ApiError,
	decodeApiError,
	getErrorMessage,
	getFieldErrors,
	readResponse,
	sendRequest
} from '../src/lib/api/http.ts'

test('API errors retain the documented envelope and actionable validation messages', async () => {
	const details = { fieldErrors: { title: ['Title is required'] }, formErrors: [] }
	await assert.rejects(
		readResponse(
			Response.json(
				{ error: { code: 'BAD_REQUEST', message: 'Validation failed', details } },
				{ status: 400 }
			)
		),
		(error: unknown) => {
			assert.ok(error instanceof ApiError)
			assert.equal(error.status, 400)
			assert.equal(error.code, 'BAD_REQUEST')
			assert.equal(error.message, 'Validation failed')
			assert.deepEqual(error.details, details)
			assert.equal(getErrorMessage(error), 'Title is required')
			assert.deepEqual(getFieldErrors(error), { title: 'Title is required' })
			return true
		}
	)
	assert.equal(decodeApiError(400, { error: 'Legacy message' }).message, 'Legacy message')
	assert.equal(decodeApiError(404, { message: 'Not found' }).message, 'Not found')
	assert.equal(decodeApiError(409, { error: { message: 'Conflict' } }).status, 409)
})

test('response parsing handles empty bodies and malformed or non-JSON responses', async () => {
	assert.equal(await readResponse(new Response(null, { status: 204 })), undefined)
	assert.equal(
		await readResponse(new Response('', { headers: { 'content-type': 'application/json' } })),
		undefined
	)
	for (const response of [
		new Response('<html>upstream failure</html>', { status: 502 }),
		new Response('{invalid', { status: 502, headers: { 'content-type': 'application/json' } })
	])
		await assert.rejects(readResponse(response), { message: 'Request failed (502)', status: 502 })
	await assert.rejects(
		readResponse(new Response('{invalid', { headers: { 'content-type': 'application/json' } })),
		{ code: 'INVALID_RESPONSE' }
	)
	assert.deepEqual(
		await readResponse(
			new Response('{"ok":true}', {
				headers: { 'content-type': 'application/example+json; charset=utf-8' }
			})
		),
		{ ok: true }
	)
})

test('transport serializes falsy bodies, preserves headers, credentials and abort signals', async () => {
	const controller = new AbortController()
	for (const body of [false, 0, null, '', undefined]) {
		await sendRequest(
			'/api/example',
			{ method: 'POST', body, signal: controller.signal, headers: { 'X-Test': 'yes' } },
			{
				fetch: async (_url, options) => {
					assert.equal(options?.body, body === undefined ? undefined : JSON.stringify(body))
					assert.equal(options?.credentials, 'same-origin')
					assert.equal(options?.signal, controller.signal)
					assert.equal(new Headers(options?.headers).get('X-Test'), 'yes')
					return Response.json({ ok: true })
				}
			}
		)
	}
	const form = new FormData()
	await sendRequest(
		'/api/example',
		{ headers: { 'content-type': 'application/custom+json' } },
		{
			fetch: async (_url, options) => {
				assert.equal(new Headers(options?.headers).get('content-type'), 'application/custom+json')
				return Response.json({ ok: true })
			}
		}
	)
	form.set('file', new Blob(['synthetic']), 'test.txt')
	await sendRequest(
		'/api/upload',
		{ method: 'POST', body: form },
		{
			fetch: async (_url, options) => {
				assert.equal(options?.body, form)
				assert.equal(new Headers(options?.headers).has('content-type'), false)
				return Response.json({ ok: true })
			}
		}
	)
	const aborted = new DOMException('Aborted', 'AbortError')
	await assert.rejects(
		sendRequest(
			'/api/example',
			{},
			{
				fetch: async () => {
					throw aborted
				}
			}
		),
		(error) => error === aborted
	)
})

test('unauthorized navigation runs once and cannot hide the original failure', async () => {
	let navigations = 0
	await assert.rejects(
		sendRequest(
			'/api/example',
			{},
			{
				fetch: async () =>
					Response.json(
						{ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
						{ status: 401 }
					),
				onUnauthorized: async () => {
					navigations++
					throw new Error('Navigation failed')
				}
			}
		),
		{ status: 401, message: 'Unauthorized', code: 'UNAUTHORIZED' }
	)
	assert.equal(navigations, 1)
})
