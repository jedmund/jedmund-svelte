import type { Album } from '$lib/types/lastfm'
import type { LastClient } from '@musicorum/lastfm'
import { SimpleNowPlayingDetector } from './simpleNowPlayingDetector'
import { AlbumEnricher } from './albumEnricher'
import { trackToAlbum } from './lastfmTransformers'
import { logger } from '$lib/server/logger'

// Type for recent tracks response
interface RecentTracksResponse {
	tracks: Array<{
		name: string
		album: {
			name: string
			mbid?: string
		}
		artist: {
			name: string
		}
		nowPlaying?: boolean
		date?: unknown
		[key: string]: unknown
	}>
	[key: string]: unknown
}

export interface StreamUpdate {
	albums?: Album[]
}

export class SimpleLastfmStreamManager {
	private client: LastClient
	private username: string
	private detector: SimpleNowPlayingDetector
	private albumEnricher: AlbumEnricher
	private lastAlbumState: string = ''

	constructor(client: LastClient, username: string) {
		this.client = client
		this.username = username
		this.detector = new SimpleNowPlayingDetector()
		this.albumEnricher = new AlbumEnricher(client)
	}

	/**
	 * Check for updates and return any changes
	 */
	async checkForUpdates(): Promise<StreamUpdate> {
		try {
			// Fetch fresh data from Last.fm
			logger.music('debug', '🔄 Fetching fresh tracks from Last.fm...')
			const recentTracksResponse = await this.client.user.getRecentTracks(this.username, {
				limit: 50,
				extended: true
			})
			logger.music('debug', `📊 Got ${recentTracksResponse.tracks?.length || 0} tracks from Last.fm`)

			// Cache for other uses but always use fresh for now playing
			await this.albumEnricher.cacheRecentTracks(this.username, recentTracksResponse as any)

			// Get recent albums (top 4)
			const albums = await this.getRecentAlbums(4, recentTracksResponse as unknown as RecentTracksResponse)

			// Debug the response structure
			logger.music('debug', `📊 Response structure check:`, {
				hasTracksProp: !!recentTracksResponse.tracks,
				trackCount: recentTracksResponse.tracks?.length || 0,
				firstTrackName: recentTracksResponse.tracks?.[0]?.name
			})
			
			// Process now playing status
			const albumsWithNowPlaying = await this.detector.processAlbums(
				albums,
				recentTracksResponse.tracks as any,
				(artistName, albumName) =>
					this.albumEnricher.getAppleMusicDataForNowPlaying(artistName, albumName)
			)

			// Enrich albums with additional data
			const enrichedAlbums = await Promise.all(
				albumsWithNowPlaying.map((album) => this.albumEnricher.enrichAlbum(album))
			)

			// Check if anything changed
			const currentState = JSON.stringify(
				enrichedAlbums.map(a => ({
					key: `${a.artist.name}:${a.name}`,
					isNowPlaying: a.isNowPlaying,
					track: a.nowPlayingTrack
				}))
			)

			if (currentState !== this.lastAlbumState) {
				this.lastAlbumState = currentState
				logger.music('debug', '📤 Albums changed, sending update')
				logger.music('debug', `Current state: ${currentState}`)
				return { albums: enrichedAlbums }
			} else {
				logger.music('debug', '🔄 No changes detected, skipping update')
			}

			return {}
		} catch (error) {
			logger.error('Error checking for updates:', error as Error, undefined, 'music')
			return {}
		}
	}

	/**
	 * Get recent albums from Last.fm tracks
	 */
	private async getRecentAlbums(
		limit: number,
		recentTracksResponse: RecentTracksResponse
	): Promise<Album[]> {
		const uniqueAlbums = new Map<string, Album>()

		for (const track of recentTracksResponse.tracks) {
			if (uniqueAlbums.size >= limit) break

			const albumKey = track.album.mbid || track.album.name
			if (!uniqueAlbums.has(albumKey)) {
				uniqueAlbums.set(albumKey, trackToAlbum(track as any, uniqueAlbums.size + 1))
			}
		}

		return Array.from(uniqueAlbums.values())
	}
}