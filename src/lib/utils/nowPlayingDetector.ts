import type { Album } from '$lib/types/lastfm'
import { logger } from '$lib/server/logger'

export interface TrackPlayInfo {
	albumName: string
	trackName: string
	scrobbleTime: Date
	durationMs?: number
}

export interface NowPlayingUpdate {
	albumName: string
	artistName: string
	isNowPlaying: boolean
	nowPlayingTrack?: string
}

export interface NowPlayingResult {
	isNowPlaying: boolean
	nowPlayingTrack?: string
}

// Configuration constants
const SCROBBLE_LAG = 3 * 60 * 1000 // 3 minutes to account for Last.fm scrobble delay
const TRACK_HISTORY_WINDOW = 60 * 60 * 1000 // Keep 1 hour of track history

export class NowPlayingDetector {
	private recentTracks: TrackPlayInfo[] = []

	/**
	 * Update the recent tracks list with new track information
	 */
	updateRecentTracks(tracks: TrackPlayInfo[]) {
		this.recentTracks = tracks
		this.cleanupOldTracks()
	}

	/**
	 * Clean up tracks older than the history window
	 */
	private cleanupOldTracks() {
		const now = new Date()
		const cutoffTime = new Date(now.getTime() - TRACK_HISTORY_WINDOW)
		
		this.recentTracks = this.recentTracks.filter(
			track => track.scrobbleTime > cutoffTime
		)
	}

	/**
	 * Check if an album is currently playing based on track duration
	 */
	checkAlbumNowPlaying(
		albumName: string,
		tracks?: Array<{ name: string; durationMs?: number }>
	): NowPlayingResult | null {
		if (!tracks) return null

		const now = new Date()

		// Find the most recent track from this album
		const albumTracks = this.recentTracks.filter(
			track => track.albumName === albumName
		)

		if (albumTracks.length === 0) {
			return { isNowPlaying: false }
		}

		// Get the most recent track
		const mostRecentTrack = albumTracks.reduce((latest, track) =>
			track.scrobbleTime > latest.scrobbleTime ? track : latest
		)

		// Find track duration from the tracks list
		const trackData = tracks.find(
			t => t.name.toLowerCase() === mostRecentTrack.trackName.toLowerCase()
		)

		if (trackData?.durationMs) {
			const trackEndTime = new Date(
				mostRecentTrack.scrobbleTime.getTime() + trackData.durationMs + SCROBBLE_LAG
			)

			if (now < trackEndTime) {
				logger.music(
					'debug',
					`Track "${mostRecentTrack.trackName}" is still playing (ends at ${trackEndTime.toLocaleTimeString()})`
				)
				return {
					isNowPlaying: true,
					nowPlayingTrack: mostRecentTrack.trackName
				}
			}
		}

		return { isNowPlaying: false }
	}

	/**
	 * Process now playing data from Last.fm API response
	 */
	processNowPlayingTracks(
		recentTracksResponse: any,
		appleMusicDataLookup: (artistName: string, albumName: string) => Promise<any>
	): Promise<Map<string, NowPlayingUpdate>> {
		return this.detectNowPlayingAlbums(recentTracksResponse.tracks, appleMusicDataLookup)
	}

	/**
	 * Detect which albums are currently playing from a list of tracks
	 */
	private async detectNowPlayingAlbums(
		tracks: any[],
		appleMusicDataLookup: (artistName: string, albumName: string) => Promise<any>
	): Promise<Map<string, NowPlayingUpdate>> {
		const albums: Map<string, NowPlayingUpdate> = new Map()
		let hasOfficialNowPlaying = false

		// Update recent tracks list
		const newRecentTracks: TrackPlayInfo[] = []
		
		// Check if Last.fm reports any track as officially now playing
		for (const track of tracks) {
			if (track.nowPlaying) {
				hasOfficialNowPlaying = true
				break
			}
		}

		// Process all tracks
		for (const track of tracks) {
			// Store track play information
			if (track.date) {
				newRecentTracks.push({
					albumName: track.album.name,
					trackName: track.name,
					scrobbleTime: track.date
				})
			}

			const albumKey = `${track.artist.name}:${track.album.name}`

			if (!albums.has(albumKey)) {
				const album: NowPlayingUpdate = {
					albumName: track.album.name,
					artistName: track.artist.name,
					isNowPlaying: track.nowPlaying || false,
					nowPlayingTrack: track.nowPlaying ? track.name : undefined
				}

				// Only use duration-based detection if Last.fm doesn't report any now playing
				if (!album.isNowPlaying && !hasOfficialNowPlaying) {
					try {
						const appleMusicData = await appleMusicDataLookup(album.artistName, album.albumName)
						if (appleMusicData?.tracks) {
							const result = this.checkAlbumNowPlaying(album.albumName, appleMusicData.tracks)
							if (result?.isNowPlaying) {
								album.isNowPlaying = true
								album.nowPlayingTrack = result.nowPlayingTrack
							}
						}
					} catch (error) {
						logger.error(`Error checking duration for ${album.albumName}:`, error as Error, undefined, 'music')
					}
				}

				albums.set(albumKey, album)
			}
		}

		// Update recent tracks
		this.updateRecentTracks(newRecentTracks)

		// Ensure only one album is marked as now playing
		return this.ensureSingleNowPlaying(albums, newRecentTracks)
	}

	/**
	 * Ensure only the most recent album is marked as now playing
	 */
	private ensureSingleNowPlaying(
		albums: Map<string, NowPlayingUpdate>,
		recentTracks: TrackPlayInfo[]
	): Map<string, NowPlayingUpdate> {
		const nowPlayingAlbums = Array.from(albums.values()).filter(a => a.isNowPlaying)
		
		if (nowPlayingAlbums.length <= 1) {
			return albums
		}

		logger.music(
			'debug',
			`Multiple albums marked as now playing (${nowPlayingAlbums.length}), keeping only the most recent one`
		)

		// Find the most recent track
		let mostRecentTime = new Date(0)
		let mostRecentAlbum = nowPlayingAlbums[0]

		for (const album of nowPlayingAlbums) {
			const albumTracks = recentTracks.filter(t => t.albumName === album.albumName)
			if (albumTracks.length > 0) {
				const latestTrack = albumTracks.reduce((latest, track) =>
					track.scrobbleTime > latest.scrobbleTime ? track : latest
				)
				if (latestTrack.scrobbleTime > mostRecentTime) {
					mostRecentTime = latestTrack.scrobbleTime
					mostRecentAlbum = album
				}
			}
		}

		// Mark all others as not playing
		nowPlayingAlbums.forEach(album => {
			if (album !== mostRecentAlbum) {
				const key = `${album.artistName}:${album.albumName}`
				albums.set(key, {
					...album,
					isNowPlaying: false,
					nowPlayingTrack: undefined
				})
			}
		})

		return albums
	}
}