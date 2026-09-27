import { api } from './api'
import type { Tag } from './tag-types'

export async function listTags(query: string, sort: string, signal: AbortSignal) {
	const [sortBy, order] = sort.split('-')
	const params = new URLSearchParams({ sort: sortBy, order, limit: '100' })
	if (query) params.set('search', query)
	const data = await api.get<{ tags: Tag[] }>(`/api/tags?${params}`, { signal })
	return data.tags
}
export function saveTag(
	payload: { name: string; description?: string },
	id: number | undefined,
	signal: AbortSignal
) {
	return id === undefined
		? api.post('/api/tags', payload, { signal })
		: api.put(`/api/tags/${id}`, payload, { signal })
}
export function deleteTag(id: number, signal: AbortSignal) {
	return api.delete(`/api/tags/${id}`, { signal })
}
export function mergeTags(sourceTagIds: number[], targetTagId: number, signal: AbortSignal) {
	return api.post('/api/tags/merge', { sourceTagIds, targetTagId }, { signal })
}
