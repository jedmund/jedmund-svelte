import type { Album } from '$lib/types/lastfm'

type AppleAlbumData = NonNullable<Album['appleMusicData']>
interface AlbumCacheDependencies {
	get: (key: string) => Promise<string | null>
	set: (key: string, value: string, ttl: number) => Promise<unknown>
	load: (artist: string, album: string) => Promise<AppleAlbumData | null>
}

// Now-playing duration lookup and album enrichment share both stored data and
// in-flight work. A rejected lookup is evicted so the next poll can recover.
export function createAppleAlbumCache(dependencies: AlbumCacheDependencies) {
	const pending = new Map<string, Promise<AppleAlbumData | null>>()
	return function getAlbum(artist: string, album: string): Promise<AppleAlbumData | null> {
		const key = `apple:album:${artist}:${album}`
		const existing = pending.get(key)
		if (existing) return existing
		const request = (async () => {
			const cached = await dependencies.get(key)
			if (cached) {
				try {
					const parsed: unknown = JSON.parse(cached)
					if (parsed && typeof parsed === 'object' && 'appleMusicId' in parsed) {
						return parsed as AppleAlbumData
					}
				} catch {
					// Discard invalid cache JSON and replace it with a fresh provider response.
				}
			}
			const data = await dependencies.load(artist, album)
			if (data) await dependencies.set(key, JSON.stringify(data), 86400)
			return data
		})()
		pending.set(key, request)
		// Return the finally promise, so cache cleanup never creates an unhandled rejection.
		const tracked = request.finally(() => {
			pending.delete(key)
		})
		pending.set(key, tracked)
		return tracked
	}
}
