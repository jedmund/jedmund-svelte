import { api } from './api'
import type { Album } from './album-types'

export async function loadAlbums(signal: AbortSignal) {
	const data = await api.get<{ albums: Album[] }>('/api/albums', { signal })
	return data.albums || []
}
export function publishAlbum(id: number, status: string, signal: AbortSignal) {
	return api.patch(`/api/albums/${id}`, { status }, { signal })
}
export function deleteAlbum(id: number, signal: AbortSignal) {
	return api.delete(`/api/albums/${id}`, { signal })
}
