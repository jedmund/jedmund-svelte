import type { Album } from '$lib/types/lastfm'
import { logger } from '$lib/server/logger'

// Type for Last.fm track from API
interface LastfmTrack {
	name: string
	album: {
		name: string
	}
	artist: {
		name: string
	}
	nowPlaying?: boolean
	date?: {
		uts: number | string
	}
	[key: string]: unknown
}

// Simple buffer time for tracks that might have paused/buffered
const BUFFER_TIME_MS = 30000 // 30 seconds grace period

export class SimpleNowPlayingDetector {
	/**
	 * Check if a track is currently playing based on simple time calculation
	 */
	isTrackPlaying(scrobbleTime: Date, durationMs: number): boolean {
		const now = new Date()
		const elapsed = now.getTime() - scrobbleTime.getTime()
		const maxPlayTime = durationMs + BUFFER_TIME_MS
		
		const isPlaying = elapsed >= 0 && elapsed <= maxPlayTime
		
		logger.music('debug', `Track playing check: elapsed=${Math.round(elapsed/1000)}s, duration=${Math.round(durationMs/1000)}s, maxPlay=${Math.round(maxPlayTime/1000)}s, isPlaying=${isPlaying}`)
		
		// Track is playing if we're within the duration + buffer
		return isPlaying
	}

	/**
	 * Process albums and determine which one is playing
	 * Returns albums with updated isNowPlaying status
	 */
	async processAlbums(
		albums: Album[],
		recentTracks: LastfmTrack[],
		appleMusicDataLookup: (
			artistName: string,
			albumName: string
		) => Promise<Album['appleMusicData'] | null>
	): Promise<Album[]> {
		logger.music('debug', `Processing ${albums.length} albums with ${recentTracks.length} recent tracks`)
		
		// First check if Last.fm reports anything as officially playing
		const officialNowPlaying = recentTracks.find(track => track.nowPlaying)
		
		if (officialNowPlaying) {
			// Trust Last.fm's official now playing status
			logger.music('debug', `✅ Last.fm official now playing: "${officialNowPlaying.name}" by ${officialNowPlaying.artist.name}`)
			
			return albums.map(album => ({
				...album,
				isNowPlaying: 
					album.name === officialNowPlaying.album.name && 
					album.artist.name === officialNowPlaying.artist.name,
				nowPlayingTrack: 
					album.name === officialNowPlaying.album.name && 
					album.artist.name === officialNowPlaying.artist.name
						? officialNowPlaying.name
						: undefined,
				lastScrobbleTime: 
					album.name === officialNowPlaying.album.name && 
					album.artist.name === officialNowPlaying.artist.name
						? new Date() // Now playing tracks are playing right now
						: album.lastScrobbleTime
			}))
		}

		// Fall back to duration-based detection
		logger.music('debug', 'Using duration-based detection')

		// Find the most recent track across all albums
		let mostRecentTrack: LastfmTrack | null = null
		let mostRecentTime = new Date(0)

		for (const track of recentTracks) {
			if (track.date && typeof track.date === 'object' && 'uts' in track.date) {
				const trackTime = new Date(Number(track.date.uts) * 1000)
				if (trackTime > mostRecentTime) {
					mostRecentTime = trackTime
					mostRecentTrack = track
				}
			}
		}
		
		if (!mostRecentTrack) {
			// No recent tracks, nothing is playing
			logger.music('debug', '❌ No recent tracks found, nothing is playing')
			return albums.map(album => ({
				...album,
				isNowPlaying: false,
				nowPlayingTrack: undefined
			}))
		}

		logger.music('debug', `Most recent track: "${mostRecentTrack.name}" by ${mostRecentTrack.artist.name} from ${mostRecentTrack.album.name}`)
		logger.music('debug', `Scrobbled at: ${mostRecentTime}`)

		// Check if the most recent track is still playing
		const albumKey = `${mostRecentTrack.artist.name}:${mostRecentTrack.album.name}`
		let isPlaying = false
		let playingTrack: string | undefined

		try {
			const appleMusicData = await appleMusicDataLookup(
				mostRecentTrack.artist.name,
				mostRecentTrack.album.name
			)

			if (appleMusicData?.tracks) {
				const trackData = appleMusicData.tracks.find(
					(t) => t.name?.toLowerCase() === mostRecentTrack!.name.toLowerCase()
				)

				if (trackData?.durationMs) {
					isPlaying = this.isTrackPlaying(mostRecentTime, trackData.durationMs)
					if (isPlaying) {
						playingTrack = mostRecentTrack.name
						logger.music('debug', `✅ "${playingTrack}" is still playing`)
					} else {
						logger.music('debug', `❌ "${mostRecentTrack.name}" has finished playing`)
					}
				} else {
					logger.music('debug', `⚠️ No duration found for track "${mostRecentTrack.name}"`)
					// Fallback: assume track is playing if scrobbled within last 5 minutes
					const timeSinceScrobble = Date.now() - mostRecentTime.getTime()
					if (timeSinceScrobble < 5 * 60 * 1000) { // 5 minutes
						isPlaying = true
						playingTrack = mostRecentTrack.name
						logger.music('debug', `⏰ Using time-based fallback: track scrobbled ${Math.round(timeSinceScrobble/1000)}s ago, assuming still playing`)
					}
				}
			}
		} catch (error) {
			logger.error('Error checking track duration:', error as Error, undefined, 'music')
			logger.music('debug', `❌ Failed to get Apple Music data for ${mostRecentTrack.artist.name} - ${mostRecentTrack.album.name}`)
			
			// Fallback when Apple Music lookup fails
			const timeSinceScrobble = Date.now() - mostRecentTime.getTime()
			if (timeSinceScrobble < 5 * 60 * 1000) { // 5 minutes
				isPlaying = true
				playingTrack = mostRecentTrack.name
				logger.music('debug', `⏰ Using time-based fallback after Apple Music error: track scrobbled ${Math.round(timeSinceScrobble/1000)}s ago`)
			}
		}

		// Update albums with the result
		return albums.map(album => {
			const key = `${album.artist.name}:${album.name}`
			const isThisAlbumPlaying = isPlaying && key === albumKey
			return {
				...album,
				isNowPlaying: isThisAlbumPlaying,
				nowPlayingTrack: isThisAlbumPlaying ? playingTrack : undefined,
				lastScrobbleTime: isThisAlbumPlaying ? mostRecentTime : album.lastScrobbleTime
			}
		})
	}
}