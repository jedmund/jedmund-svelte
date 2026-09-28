import type { Media } from '@prisma/client'
import { responseData } from '../response'

export interface MediaFilters {
	type: string
	photography: string
	search: string
	albumId?: number
}
export interface MediaPage {
	media: Media[]
	pagination: { totalPages: number }
}
export interface AlbumSummary {
	id: number
	title: string
	slug: string
	_count?: { media: number }
}
export interface MediaUsage {
	contentType: string
	contentId: number
	contentTitle: string
	fieldDisplayName: string
	contentUrl?: string
	createdAt: string
}

export async function mediaRequest<T>(url: string, signal: AbortSignal, options: RequestInit = {}) {
	return responseData<T>(await fetch(url, { ...options, signal, credentials: 'same-origin' }))
}

export function loadMediaPage(filters: MediaFilters, page: number, signal: AbortSignal) {
	const query = new URLSearchParams({ page: String(page), limit: '24' })
	if (filters.type !== 'all') query.set('mimeType', filters.type)
	if (filters.photography !== 'all') query.set('isPhotography', filters.photography)
	if (filters.search) query.set('search', filters.search)
	if (filters.albumId) query.set('albumId', String(filters.albumId))
	return mediaRequest<MediaPage>(`/api/media?${query}`, signal)
}

export function changeAlbumMembership(
	albumId: number,
	mediaIds: number[],
	selected: boolean,
	signal: AbortSignal
) {
	return mediaRequest(`/api/albums/${albumId}/media`, signal, {
		method: selected ? 'POST' : 'DELETE',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ mediaIds })
	})
}

export async function loadAlbums(signal: AbortSignal): Promise<AlbumSummary[]> {
	const albums: AlbumSummary[] = []
	let offset = 0
	while (!signal.aborted) {
		const data = await mediaRequest<{
			albums: AlbumSummary[]
			pagination: { total: number; limit: number }
		}>(`/api/albums?limit=100&offset=${offset}`, signal)
		albums.push(...data.albums)
		offset += data.albums.length
		if (!data.albums.length || offset >= data.pagination.total) break
	}
	return albums
}

export function createAlbum(title: string, slug: string, signal: AbortSignal) {
	return mediaRequest<AlbumSummary>('/api/albums', signal, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			title: title.trim(),
			slug: slug.trim(),
			isPhotography: true,
			status: 'draft'
		})
	})
}
