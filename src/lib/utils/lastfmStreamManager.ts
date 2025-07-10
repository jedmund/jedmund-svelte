import type { Album } from '$lib/types/lastfm'
import type { LastClient } from '@musicorum/lastfm'
import { NowPlayingDetector, type NowPlayingUpdate } from './nowPlayingDetector'
import { AlbumEnricher } from './albumEnricher'
import { trackToAlbum, getAlbumKey } from './lastfmTransformers'
import { logger } from '$lib/server/logger'

export interface StreamState {
	lastNowPlayingState: Map<string, { isPlaying: boolean; track?: string }>
	lastAlbumOrder: string[]
}

export interface StreamUpdate {
	albums?: Album[]
	nowPlayingUpdates?: NowPlayingUpdate[]
}

export class LastfmStreamManager {
	private client: LastClient
	private username: string
	private nowPlayingDetector: NowPlayingDetector
	private albumEnricher: AlbumEnricher
	private state: StreamState

	constructor(client: LastClient, username: string) {
		this.client = client
		this.username = username
		this.nowPlayingDetector = new NowPlayingDetector()
		this.albumEnricher = new AlbumEnricher(client)
		this.state = {
			lastNowPlayingState: new Map(),
			lastAlbumOrder: []
		}
	}

	/**
	 * Check for updates and return any changes
	 */
	async checkForUpdates(): Promise<StreamUpdate> {
		try {
			// Always fetch fresh data for now playing detection
			const freshData = await this.fetchFreshRecentTracks()
			
			// Fetch recent albums
			const albums = await this.getRecentAlbums(4, freshData)

			// Process now playing status
			await this.updateNowPlayingStatus(albums, freshData)

			// Enrich albums with additional data
			const enrichedAlbums = await this.enrichAlbums(albums)

			// Ensure only one album is marked as now playing
			this.ensureSingleNowPlaying(enrichedAlbums)

			// Check for changes
			const update: StreamUpdate = {}

			// Check if album order or now playing status changed
			if (this.hasAlbumsChanged(enrichedAlbums)) {
				update.albums = enrichedAlbums
				this.updateState(enrichedAlbums)
			}

			// Check for now playing updates for non-recent albums
			const nowPlayingUpdates = await this.getNowPlayingUpdatesForNonRecentAlbums(enrichedAlbums, freshData)
			if (nowPlayingUpdates.length > 0) {
				update.nowPlayingUpdates = nowPlayingUpdates
			}

			return update
		} catch (error) {
			logger.error('Error checking for updates:', error as Error, undefined, 'music')
			return {}
		}
	}

	/**
	 * Fetch fresh recent tracks from Last.fm (no cache)
	 */
	private async fetchFreshRecentTracks(): Promise<any> {
		logger.music('debug', 'Fetching fresh Last.fm recent tracks for now playing detection')
		const recentTracksResponse = await this.client.user.getRecentTracks(this.username, {
			limit: 50,
			extended: true
		})
		// Still cache it for other uses, but always fetch fresh for now playing
		await this.albumEnricher.cacheRecentTracks(this.username, recentTracksResponse)
		return recentTracksResponse
	}

	/**
	 * Get recent albums from Last.fm
	 */
	private async getRecentAlbums(limit: number, recentTracksResponse?: any): Promise<Album[]> {
		// Use provided fresh data or fetch new
		if (!recentTracksResponse) {
			recentTracksResponse = await this.fetchFreshRecentTracks()
		}

		// Convert tracks to unique albums
		const uniqueAlbums = new Map<string, Album>()

		for (const track of recentTracksResponse.tracks) {
			if (uniqueAlbums.size >= limit) break

			const albumKey = track.album.mbid || track.album.name
			if (!uniqueAlbums.has(albumKey)) {
				uniqueAlbums.set(albumKey, trackToAlbum(track, uniqueAlbums.size + 1))
			} else if (track.nowPlaying) {
				// Update existing album if this track is now playing
				const existingAlbum = uniqueAlbums.get(albumKey)!
				uniqueAlbums.set(albumKey, {
					...existingAlbum,
					isNowPlaying: true,
					nowPlayingTrack: track.name
				})
			}
		}

		return Array.from(uniqueAlbums.values())
	}

	/**
	 * Update now playing status using the detector
	 */
	private async updateNowPlayingStatus(albums: Album[], recentTracksResponse?: any): Promise<void> {
		// Use provided fresh data or fetch new
		if (!recentTracksResponse) {
			recentTracksResponse = await this.fetchFreshRecentTracks()
		}

		// Process now playing detection
		const nowPlayingMap = await this.nowPlayingDetector.processNowPlayingTracks(
			recentTracksResponse,
			(artistName, albumName) =>
				this.albumEnricher.getAppleMusicDataForNowPlaying(artistName, albumName)
		)

		// Update albums with now playing status
		for (const album of albums) {
			const key = getAlbumKey(album.artist.name, album.name)
			const nowPlayingInfo = nowPlayingMap.get(key)

			if (nowPlayingInfo) {
				album.isNowPlaying = nowPlayingInfo.isNowPlaying
				album.nowPlayingTrack = nowPlayingInfo.nowPlayingTrack
			}
		}
	}

	/**
	 * Enrich albums with additional data
	 */
	private async enrichAlbums(albums: Album[]): Promise<Album[]> {
		return Promise.all(albums.map((album) => this.albumEnricher.enrichAlbum(album)))
	}

	/**
	 * Ensure only one album is marked as now playing
	 */
	private ensureSingleNowPlaying(albums: Album[]): void {
		const nowPlayingCount = albums.filter((a) => a.isNowPlaying).length

		if (nowPlayingCount > 1) {
			logger.music(
				'debug',
				`Multiple enriched albums marked as now playing (${nowPlayingCount}), keeping only the most recent one`
			)

			// Keep only the first now playing album (albums are already sorted by recency)
			let foundFirst = false
			albums.forEach((album, index) => {
				if (album.isNowPlaying) {
					if (foundFirst) {
						logger.music(
							'debug',
							`Marking album "${album.name}" at position ${index} as not playing`
						)
						album.isNowPlaying = false
						album.nowPlayingTrack = undefined
					} else {
						logger.music(
							'debug',
							`Keeping album "${album.name}" at position ${index} as now playing`
						)
						foundFirst = true
					}
				}
			})
		}
	}

	/**
	 * Check if albums have changed
	 */
	private hasAlbumsChanged(albums: Album[]): boolean {
		// Check album order
		const currentAlbumOrder = albums.map((a) => getAlbumKey(a.artist.name, a.name))
		const albumOrderChanged =
			JSON.stringify(currentAlbumOrder) !== JSON.stringify(this.state.lastAlbumOrder)

		// Check now playing status
		let nowPlayingChanged = false
		for (const album of albums) {
			const key = getAlbumKey(album.artist.name, album.name)
			const lastState = this.state.lastNowPlayingState.get(key)
			if (
				album.isNowPlaying !== (lastState?.isPlaying || false) ||
				(album.isNowPlaying && album.nowPlayingTrack !== lastState?.track)
			) {
				nowPlayingChanged = true
				break
			}
		}

		return albumOrderChanged || nowPlayingChanged
	}

	/**
	 * Update internal state
	 */
	private updateState(albums: Album[]): void {
		this.state.lastAlbumOrder = albums.map((a) => getAlbumKey(a.artist.name, a.name))

		for (const album of albums) {
			const key = getAlbumKey(album.artist.name, album.name)
			this.state.lastNowPlayingState.set(key, {
				isPlaying: album.isNowPlaying || false,
				track: album.nowPlayingTrack
			})
		}
	}

	/**
	 * Get now playing updates for albums not in the recent list
	 */
	private async getNowPlayingUpdatesForNonRecentAlbums(
		recentAlbums: Album[],
		recentTracksResponse?: any
	): Promise<NowPlayingUpdate[]> {
		const updates: NowPlayingUpdate[] = []

		// Use provided fresh data or fetch new
		if (!recentTracksResponse) {
			recentTracksResponse = await this.fetchFreshRecentTracks()
		}

		const nowPlayingMap = await this.nowPlayingDetector.processNowPlayingTracks(
			recentTracksResponse,
			(artistName, albumName) =>
				this.albumEnricher.getAppleMusicDataForNowPlaying(artistName, albumName)
		)

		// Find albums that are now playing but not in recent albums
		for (const [key, nowPlayingInfo] of nowPlayingMap) {
			const isInRecentAlbums = recentAlbums.some((a) => getAlbumKey(a.artist.name, a.name) === key)

			if (!isInRecentAlbums) {
				const lastState = this.state.lastNowPlayingState.get(key)
				const wasPlaying = lastState?.isPlaying || false
				const lastTrack = lastState?.track

				// Update if playing status changed OR if the track changed
				if (
					nowPlayingInfo.isNowPlaying !== wasPlaying ||
					(nowPlayingInfo.isNowPlaying && nowPlayingInfo.nowPlayingTrack !== lastTrack)
				) {
					updates.push(nowPlayingInfo)
					logger.music(
						'debug',
						`Now playing update for non-recent album ${nowPlayingInfo.albumName}: playing=${nowPlayingInfo.isNowPlaying}, track=${nowPlayingInfo.nowPlayingTrack}`
					)
				}

				this.state.lastNowPlayingState.set(key, {
					isPlaying: nowPlayingInfo.isNowPlaying,
					track: nowPlayingInfo.nowPlayingTrack
				})
			}
		}

		return updates
	}
}
