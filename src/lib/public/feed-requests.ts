import { responseData } from '$lib/admin/response'
import type { Photo } from '$lib/types/photos'
import type { PublicAlbum } from './types'

export async function loadPublicPhotos(offset: number, limit: number, signal: AbortSignal) {
	const data = await responseData<{
		photoItems: Photo[]
		pagination: { limit: number; hasMore: boolean }
	}>(await fetch(`/api/photos?limit=${limit}&offset=${offset}`, { signal }))
	return {
		items: data.photoItems || [],
		limit: data.pagination?.limit || limit,
		hasMore: !!data.pagination?.hasMore
	}
}
export async function loadPublicAlbums(offset: number, limit: number, signal: AbortSignal) {
	const data = await responseData<{
		albums: PublicAlbum[]
		pagination: { limit: number; hasMore: boolean }
	}>(await fetch(`/api/albums?limit=${limit}&offset=${offset}`, { signal }))
	return {
		items: data.albums || [],
		limit: data.pagination?.limit || limit,
		hasMore: !!data.pagination?.hasMore
	}
}
