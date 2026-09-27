import { transformAlbumData } from '$lib/server/apple-music-normalization'
import type { Album } from '$lib/types/lastfm'
import type { LastClient } from '@musicorum/lastfm'
import { findAlbum } from '$lib/server/apple-music-client'
import { transformImages, mergeAppleMusicData } from '$lib/utils/lastfmTransformers'
import redis from '$lib/server/redis-client'
import { logger } from '$lib/server/logger'

import { createAppleAlbumCache } from './album-cache'

const getAppleAlbum = createAppleAlbumCache({
	get: (key) => redis.get(key),
	set: (key, value, ttl) => redis.set(key, value, 'EX', ttl),
	load: async (artist, album) => {
		const found = await findAlbum(artist, album)
		return found ? transformAlbumData(found) : null
	}
})

// Type for cached recent tracks data
interface RecentTracksData {
	tracks: Array<{
		name: string
		artist: string
		album?: string
		date?: Date | string
		[key: string]: unknown
	}>
	[key: string]: unknown
}

export class AlbumEnricher {
	private client: LastClient
	private cacheTTL = {
		albumInfo: 3600, // 1 hour for album info
		recentTracks: 30 // 30 seconds for recent tracks
	}

	constructor(client: LastClient) {
		this.client = client
	}

	/**
	 * Enrich an album with additional information from Last.fm
	 */
	async enrichWithLastfmInfo(album: Album): Promise<Album> {
		const cacheKey = `lastfm:albuminfo:${album.artist.name}:${album.name}`
		const cached = await redis.get(cacheKey)

		if (cached) {
			logger.music('debug', `Using cached album info for "${album.name}"`)
			const albumInfo = JSON.parse(cached)
			return {
				...album,
				url: albumInfo?.url || '',
				images: transformImages(albumInfo?.images || [])
			}
		}

		logger.music('debug', `Fetching fresh album info for "${album.name}"`)
		try {
			const albumInfo = await this.client.album.getInfo(album.name, album.artist.name)

			// Cache the result
			await redis.set(cacheKey, JSON.stringify(albumInfo), 'EX', this.cacheTTL.albumInfo)

			return {
				...album,
				url: albumInfo?.url || '',
				images: transformImages(albumInfo?.images || [])
			}
		} catch (error) {
			logger.error(
				`Failed to fetch album info for "${album.name}":`,
				error as Error,
				undefined,
				'music'
			)
			return album
		}
	}

	/**
	 * Enrich an album with Apple Music data
	 */
	async enrichWithAppleMusic(album: Album): Promise<Album> {
		try {
			const data = await getAppleAlbum(album.artist.name, album.name)
			if (data) return mergeAppleMusicData(album, data)
		} catch (error) {
			logger.error(
				`Failed to fetch Apple Music data for "${album.name}" by "${album.artist.name}":`,
				error as Error,
				undefined,
				'music'
			)
		}

		// Return album unchanged if Apple Music search fails
		return album
	}

	/**
	 * Fully enrich an album with both Last.fm and Apple Music data
	 */
	async enrichAlbum(album: Album): Promise<Album> {
		try {
			const withLastfmInfo = await this.enrichWithLastfmInfo(album)
			const withAppleMusic = await this.enrichWithAppleMusic(withLastfmInfo)
			return withAppleMusic
		} catch (error) {
			logger.error(`Error enriching album ${album.name}:`, error as Error, undefined, 'music')
			return album
		}
	}

	/**
	 * Get Apple Music data for duration-based now playing detection
	 */
	async getAppleMusicDataForNowPlaying(
		artistName: string,
		albumName: string
	): Promise<Album['appleMusicData'] | null> {
		try {
			return await getAppleAlbum(artistName, albumName)
		} catch (error) {
			logger.error(
				`Error fetching Apple Music data for ${albumName}:`,
				error as Error,
				undefined,
				'music'
			)
			return null
		}
	}

	/**
	 * Cache recent tracks from Last.fm
	 */
	async cacheRecentTracks(username: string, recentTracks: RecentTracksData): Promise<void> {
		const cacheKey = `lastfm:recent:${username}`
		await redis.set(cacheKey, JSON.stringify(recentTracks), 'EX', this.cacheTTL.recentTracks)
	}

	/**
	 * Get cached recent tracks
	 */
	async getCachedRecentTracks(username: string): Promise<RecentTracksData | null> {
		const cacheKey = `lastfm:recent:${username}`
		const cached = await redis.get(cacheKey)

		if (cached) {
			const data = JSON.parse(cached) as RecentTracksData
			// Convert date strings back to Date objects
			if (data.tracks) {
				data.tracks = data.tracks.map((track) => ({
					...track,
					date: track.date ? new Date(track.date) : undefined
				}))
			}
			return data
		}

		return null
	}
}
