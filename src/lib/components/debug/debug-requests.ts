import { responseData } from '$lib/admin/response'

export type CacheSelector = { key: string } | { pattern: string }

export async function clearDebugCache(selector: CacheSelector, signal?: AbortSignal) {
	const response = await fetch('/api/admin/debug/clear-cache', {
		method: 'POST',
		credentials: 'same-origin',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(selector),
		signal
	})
	const data = await responseData<{ deleted?: unknown }>(response)
	if (!data || typeof data.deleted !== 'number' || !Number.isFinite(data.deleted)) {
		throw new Error('Invalid cache response')
	}
	return { deleted: data.deleted }
}

export async function searchAppleMusic(query: string, storefront: string, signal: AbortSignal) {
	const response = await fetch('/api/admin/debug/apple-music-search', {
		method: 'POST',
		credentials: 'same-origin',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ query, storefront }),
		signal
	})
	return responseData(response)
}
