import { goto } from '$app/navigation'
import { sendRequest, type RequestOptions } from '$lib/api/http'
export { ApiError, getErrorMessage, getFieldErrors } from '$lib/api/http'
export type { RequestOptions, HttpMethod } from '$lib/api/http'

export function request<TResponse = unknown, TBody = unknown>(
	url: string,
	opts: RequestOptions<TBody> = {}
): Promise<TResponse> {
	return sendRequest<TResponse, TBody>(url, opts, { onUnauthorized: () => goto('/admin/login') })
}

export const api = {
	get: <T = unknown>(url: string, opts: Omit<RequestOptions, 'method' | 'body'> = {}) =>
		request<T>(url, { ...opts, method: 'GET' }),
	post: <T = unknown, B = unknown>(
		url: string,
		body: B,
		opts: Omit<RequestOptions<B>, 'method' | 'body'> = {}
	) => request<T, B>(url, { ...opts, method: 'POST', body }),
	put: <T = unknown, B = unknown>(
		url: string,
		body: B,
		opts: Omit<RequestOptions<B>, 'method' | 'body'> = {}
	) => request<T, B>(url, { ...opts, method: 'PUT', body }),
	patch: <T = unknown, B = unknown>(
		url: string,
		body: B,
		opts: Omit<RequestOptions<B>, 'method' | 'body'> = {}
	) => request<T, B>(url, { ...opts, method: 'PATCH', body }),
	delete: <T = unknown>(url: string, opts: Omit<RequestOptions, 'method' | 'body'> = {}) =>
		request<T>(url, { ...opts, method: 'DELETE' })
}

export function createAbortable() {
	let controller: AbortController | null = null
	return {
		nextSignal() {
			if (controller) controller.abort()
			controller = new AbortController()
			return controller.signal
		},
		abort() {
			if (controller) controller.abort()
		}
	}
}
