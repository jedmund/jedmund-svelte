import { goto } from '$app/navigation'
import { responseData } from './response'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface RequestOptions<TBody = unknown> {
	method?: HttpMethod
	body?: TBody
	signal?: AbortSignal
	headers?: Record<string, string>
}

async function handleResponse(res: Response) {
	if (res.status === 401) {
		try {
			await goto('/admin/login')
		} catch {
			// Preserve the HTTP error even if navigation fails or is unavailable during SSR.
		}
	}
	return responseData(res)
}

export async function request<TResponse = unknown, TBody = unknown>(
	url: string,
	opts: RequestOptions<TBody> = {}
): Promise<TResponse> {
	const { method = 'GET', body, signal, headers } = opts

	const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
	const mergedHeaders: Record<string, string> = {
		...(isFormData ? {} : { 'Content-Type': 'application/json' }),
		...(headers || {})
	}

	const res = await fetch(url, {
		method,
		headers: mergedHeaders,
		body: body ? (isFormData ? (body as FormData) : JSON.stringify(body)) : undefined,
		signal,
		credentials: 'same-origin'
	})

	return handleResponse(res) as Promise<TResponse>
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
