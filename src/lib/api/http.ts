export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface RequestOptions<TBody = unknown> {
	method?: HttpMethod
	body?: TBody
	signal?: AbortSignal
	headers?: Record<string, string>
}

export class ApiError extends Error {
	constructor(
		message: string,
		public readonly status: number,
		public readonly code?: string,
		public readonly details?: unknown
	) {
		super(message)
		this.name = 'ApiError'
	}
}

function record(value: unknown): Record<string, unknown> | undefined {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined
}

export function decodeApiError(status: number, body: unknown): ApiError {
	const data = record(body)
	const error = record(data?.error)
	const message = error?.message ?? (typeof data?.error === 'string' ? data.error : data?.message)
	return new ApiError(
		typeof message === 'string' && message.trim() ? message : `Request failed (${status})`,
		status,
		typeof error?.code === 'string' ? error.code : undefined,
		error?.details
	)
}

export function getErrorMessage(error: unknown, fallback = 'Request failed'): string {
	if (!(error instanceof Error)) return fallback
	if (error instanceof ApiError) {
		const details = record(error.details)
		const fields = record(details?.fieldErrors)
		const messages = [
			...(Array.isArray(details?.formErrors) ? details.formErrors : []),
			...Object.values(fields ?? {}).flatMap((value) => (Array.isArray(value) ? value : []))
		].filter((value): value is string => typeof value === 'string')
		if (messages.length) return [...new Set(messages)].join('; ')
	}
	return error.message || fallback
}

export function getFieldErrors(error: unknown): Record<string, string> {
	if (!(error instanceof ApiError)) return {}
	const fields = record(record(error.details)?.fieldErrors)
	return Object.fromEntries(
		Object.entries(fields ?? {}).flatMap(([key, value]) =>
			Array.isArray(value) && typeof value[0] === 'string' ? [[key, value[0]]] : []
		)
	)
}

export async function readResponse(response: Response): Promise<unknown> {
	const text = await response.text()
	const isJson = /(?:application\/json|\+json)(?:;|$)/i.test(
		response.headers.get('content-type') ?? ''
	)
	let data: unknown
	if (text && isJson) {
		try {
			data = JSON.parse(text)
		} catch {
			if (response.ok)
				throw new ApiError('Invalid JSON response', response.status, 'INVALID_RESPONSE')
		}
	}
	if (!response.ok) throw decodeApiError(response.status, data)
	return data
}

/** Transport without framework imports, usable in tests and browser adapters. */
export async function sendRequest<TResponse = unknown, TBody = unknown>(
	url: string,
	opts: RequestOptions<TBody> = {},
	dependencies: { fetch?: typeof fetch; onUnauthorized?: () => void | Promise<void> } = {}
): Promise<TResponse> {
	const { method = 'GET', body, signal, headers } = opts
	const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
	const requestHeaders = new Headers(headers)
	if (!isFormData && !requestHeaders.has('Content-Type')) {
		requestHeaders.set('Content-Type', 'application/json')
	}
	const response = await (dependencies.fetch ?? fetch)(url, {
		method,
		headers: requestHeaders,
		body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
		signal,
		credentials: 'same-origin'
	})
	if (response.status === 401) {
		try {
			await dependencies.onUnauthorized?.()
		} catch {
			// Navigation failure must not mask the API error.
		}
	}
	return (await readResponse(response)) as TResponse
}
