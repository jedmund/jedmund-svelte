import { onDestroy } from 'svelte'
import { toast } from 'svelte-sonner'
import type { Album } from '$lib/types/lastfm'
import { createDebugCacheSession } from './cache-session'

export function useDebugCache() {
	let pending = $state(new Set<string>())
	const session = createDebugCacheSession({
		pending: (keys) => {
			pending = keys
		},
		success: (message) => toast.success(message),
		error: (error) => {
			toast.error('Error clearing cache')
			console.error(error)
		}
	})
	onDestroy(session.dispose)
	return {
		get isClearing() {
			return pending.size > 0
		},
		get clearingAlbums() {
			return new Set(
				[...pending]
					.filter((key) => key.startsWith('apple:album:'))
					.map((key) => key.slice('apple:album:'.length))
			)
		},
		clear: session.clear,
		clearAlbumCache(album: Album) {
			return session.clear(
				{ key: `apple:album:${album.artist.name}:${album.name}` },
				`Cleared cache for "${album.name}"`
			)
		}
	}
}
