import type { Album } from '$lib/types/lastfm'
import type { LastClient } from '@musicorum/lastfm'
import { findAlbum, transformAlbumData } from '$lib/server/apple-music-client'
import { transformImages, mergeAppleMusicData } from './lastfmTransformers'
import redis from '../../routes/api/redis-client'
import { logger } from '$lib/server/logger'

export class AlbumEnricher {
	private client: LastClient
	private cacheTTL = {
		albumInfo: 3600, // 1 hour for album info
		appleMusicData: 86400, // 24 hours for Apple Music data
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
			const cacheKey = `apple:album:${album.artist.name}:${album.name}`
			const cached = await redis.get(cacheKey)

			if (cached) {
				const cachedData = JSON.parse(cached)
				return mergeAppleMusicData(album, cachedData)
			}

			// Search Apple Music
			const appleMusicAlbum = await findAlbum(album.artist.name, album.name)

			if (appleMusicAlbum) {
				const transformedData = await transformAlbumData(appleMusicAlbum)

				// Cache the result
				await redis.set(
					cacheKey,
					JSON.stringify(transformedData),
					'EX',
					this.cacheTTL.appleMusicData
				)

				return mergeAppleMusicData(album, transformedData)
			}
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
	async getAppleMusicDataForNowPlaying(artistName: string, albumName: string): Promise<any> {
		const cacheKey = `apple:album:${artistName}:${albumName}`
		const cached = await redis.get(cacheKey)

		if (cached) {
			return JSON.parse(cached)
		}

		try {
			const appleMusicAlbum = await findAlbum(artistName, albumName)
			if (!appleMusicAlbum) return null

			const transformedData = await transformAlbumData(appleMusicAlbum)
			await redis.set(cacheKey, JSON.stringify(transformedData), 'EX', this.cacheTTL.appleMusicData)

			return transformedData
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
	async cacheRecentTracks(username: string, recentTracks: any): Promise<void> {
		const cacheKey = `lastfm:recent:${username}`
		await redis.set(cacheKey, JSON.stringify(recentTracks), 'EX', this.cacheTTL.recentTracks)
	}

	/**
	 * Get cached recent tracks
	 */
	async getCachedRecentTracks(username: string): Promise<any | null> {
		const cacheKey = `lastfm:recent:${username}`
		const cached = await redis.get(cacheKey)

		if (cached) {
			const data = JSON.parse(cached)
			// Convert date strings back to Date objects
			if (data.tracks) {
				data.tracks = data.tracks.map((track: any) => ({
					...track,
					date: track.date ? new Date(track.date) : undefined
				}))
			}
			return data
		}

		return null
	}
}
