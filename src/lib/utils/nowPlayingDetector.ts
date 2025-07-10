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

// Confidence thresholds
const CONFIDENCE_HIGH = 0.9
const CONFIDENCE_MEDIUM = 0.6
const CONFIDENCE_LOW = 0.3

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

		this.recentTracks = this.recentTracks.filter((track) => track.scrobbleTime > cutoffTime)
	}

	/**
	 * Calculate confidence score for now playing detection
	 */
	private calculateConfidence(
		scrobbleTime: Date,
		durationMs: number,
		now: Date = new Date()
	): { confidence: number; reason: string } {
		const elapsed = now.getTime() - scrobbleTime.getTime()
		const progress = elapsed / durationMs

		// Very confident if within normal playback window
		if (progress >= 0 && progress <= 1.0) {
			return { confidence: CONFIDENCE_HIGH, reason: 'within normal playback' }
		}

		// Medium confidence if slightly over (accounting for buffering/pauses)
		if (progress > 1.0 && progress <= 1.2) {
			return { confidence: CONFIDENCE_MEDIUM, reason: 'slightly over duration (buffering/pauses)' }
		}

		// Low confidence if significantly over but within lag window
		if (progress > 1.2 && elapsed <= durationMs + SCROBBLE_LAG) {
			return { confidence: CONFIDENCE_LOW, reason: 'significantly over but within lag window' }
		}

		// No confidence if too far past expected end
		return { confidence: 0, reason: 'track ended' }
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
		const albumTracks = this.recentTracks.filter((track) => track.albumName === albumName)

		if (albumTracks.length === 0) {
			return { isNowPlaying: false }
		}

		// Get the most recent track
		const mostRecentTrack = albumTracks.reduce((latest, track) =>
			track.scrobbleTime > latest.scrobbleTime ? track : latest
		)

		// Find track duration from the tracks list
		const trackData = tracks.find(
			(t) => t.name.toLowerCase() === mostRecentTrack.trackName.toLowerCase()
		)

		if (trackData?.durationMs) {
			const { confidence, reason } = this.calculateConfidence(
				mostRecentTrack.scrobbleTime,
				trackData.durationMs,
				now
			)

			// Only consider it playing if confidence is above threshold
			if (confidence >= CONFIDENCE_LOW) {
				logger.music(
					'debug',
					`Track "${mostRecentTrack.trackName}" detected as playing (confidence: ${confidence}, ${reason})`
				)
				return {
					isNowPlaying: true,
					nowPlayingTrack: mostRecentTrack.trackName
				}
			} else {
				logger.music(
					'debug',
					`Track "${mostRecentTrack.trackName}" confidence too low: ${confidence} (${reason})`
				)
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
				logger.music('debug', `Last.fm reports "${track.name}" by ${track.artist.name} as now playing`)
				break
			}
		}

		if (!hasOfficialNowPlaying) {
			logger.music('debug', 'No official now playing from Last.fm, will use duration-based detection')
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
							logger.music(
								'debug',
								`Checking duration-based detection for "${album.albumName}" (${appleMusicData.tracks.length} tracks)`
							)
							const result = this.checkAlbumNowPlaying(album.albumName, appleMusicData.tracks)
							if (result?.isNowPlaying) {
								album.isNowPlaying = true
								album.nowPlayingTrack = result.nowPlayingTrack
								logger.music(
									'debug',
									`Duration-based detection: "${album.nowPlayingTrack}" from "${album.albumName}" is now playing`
								)
							}
						}
					} catch (error) {
						logger.error(
							`Error checking duration for ${album.albumName}:`,
							error as Error,
							undefined,
							'music'
						)
					}
				}

				albums.set(albumKey, album)
			}
		}

		// Update recent tracks
		this.updateRecentTracks(newRecentTracks)

		// Log summary
		const nowPlayingCount = Array.from(albums.values()).filter(a => a.isNowPlaying).length
		logger.music('debug', `Detected ${nowPlayingCount} album(s) as now playing out of ${albums.size} recent albums`)

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
		const nowPlayingAlbums = Array.from(albums.values()).filter((a) => a.isNowPlaying)

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
			const albumTracks = recentTracks.filter((t) => t.albumName === album.albumName)
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
		nowPlayingAlbums.forEach((album) => {
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
