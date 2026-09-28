export interface ApiError extends Error {
	status: number
	details?: unknown
}

export async function responseData<T>(response: Response, fallback = 'Request failed'): Promise<T> {
	const data: unknown = await response.json().catch(() => undefined)
	if (!response.ok) {
		const error = data && typeof data === 'object' && 'error' in data ? data.error : null
		const message =
			typeof error === 'string'
				? error
				: error && typeof error === 'object' && 'message' in error
					? error.message
					: null
		throw Object.assign(new Error(typeof message === 'string' && message ? message : fallback), {
			status: response.status,
			details: data
		}) satisfies ApiError
	}
	return data as T
}
