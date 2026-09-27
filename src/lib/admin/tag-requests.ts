import { api } from './api'

export interface TagSuggestion {
	id: number
	name: string
	displayName: string
	slug: string
	usageCount?: number
}

export async function suggestTags(query: string, signal: AbortSignal) {
	const data = await api.get<{ suggestions: TagSuggestion[] }>(
		`/api/tags/suggest?q=${encodeURIComponent(query)}&limit=5`,
		{ signal }
	)
	return data.suggestions
}

export async function createTag(name: string) {
	const data = await api.post<{ tag: TagSuggestion }>('/api/tags', { name })
	return data.tag
}
