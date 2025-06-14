import { LastClient } from '@musicorum/lastfm'
import type { RequestHandler } from './$types'
import type { Album } from '$lib/types/lastfm'
import { findAlbum, transformAlbumData } from '$lib/server/apple-music-client'
import redis from '../../redis-client'

const LASTFM_API_KEY = process.env.LASTFM_API_KEY
const USERNAME = 'jedmund'
const UPDATE_INTERVAL = 30000 // 30 seconds

interface NowPlayingUpdate {
	albumName: string
	artistName: string
	isNowPlaying: boolean
	nowPlayingTrack?: string
}

// Store recent tracks for duration-based detection
interface TrackPlayInfo {
	albumName: string
	trackName: string
	scrobbleTime: Date
	durationMs?: number
}

let recentTracks: TrackPlayInfo[] = []

export const GET: RequestHandler = async ({ request }) => {
	const encoder = new TextEncoder()
	
	const stream = new ReadableStream({
		async start(controller) {
			const client = new LastClient(LASTFM_API_KEY || '')
			let lastNowPlayingState: Map<string, boolean> = new Map()
			
			// Send initial connection message
			controller.enqueue(encoder.encode('event: connected\ndata: {}\n\n'))
			
			const checkForUpdates = async () => {
				try {
					const nowPlayingAlbums = await getNowPlayingAlbums(client)
					const updates: NowPlayingUpdate[] = []
					
					// Check for changes
					for (const album of nowPlayingAlbums) {
						const key = `${album.artistName}:${album.albumName}`
						const wasPlaying = lastNowPlayingState.get(key) || false
						
						if (album.isNowPlaying !== wasPlaying) {
							updates.push(album)
							lastNowPlayingState.set(key, album.isNowPlaying)
						}
					}
					
					// Send updates if any
					if (updates.length > 0) {
						const data = JSON.stringify(updates)
						controller.enqueue(encoder.encode(`event: nowplaying\ndata: ${data}\n\n`))
					}
					
					// Send heartbeat to keep connection alive
					controller.enqueue(encoder.encode('event: heartbeat\ndata: {}\n\n'))
				} catch (error) {
					console.error('Error checking for updates:', error)
				}
			}
			
			// Initial check
			await checkForUpdates()
			
			// Set up interval
			const intervalId = setInterval(checkForUpdates, UPDATE_INTERVAL)
			
			// Handle client disconnect
			request.signal.addEventListener('abort', () => {
				clearInterval(intervalId)
				controller.close()
			})
		},
		
		cancel() {
			// Cleanup when stream is cancelled
			console.log('SSE stream cancelled')
		}
	})
	
	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive',
			'X-Accel-Buffering': 'no' // Disable Nginx buffering
		}
	})
}

async function getNowPlayingAlbums(client: LastClient): Promise<NowPlayingUpdate[]> {
	const recentTracksResponse = await client.user.getRecentTracks(USERNAME, { limit: 50, extended: true })
	const albums: Map<string, NowPlayingUpdate> = new Map()
	
	// Clear old tracks and collect new track play information
	recentTracks = []
	
	for (const track of recentTracksResponse.tracks) {
		// Store track play information
		if (track.date) {
			recentTracks.push({
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
			
			// If not marked as now playing by Last.fm, check with duration-based detection
			if (!album.isNowPlaying) {
				const updatedStatus = await checkNowPlayingWithDuration(album.albumName, album.artistName)
				if (updatedStatus) {
					album.isNowPlaying = updatedStatus.isNowPlaying
					album.nowPlayingTrack = updatedStatus.nowPlayingTrack
				}
			}
			
			albums.set(albumKey, album)
		}
	}
	
	return Array.from(albums.values())
}

async function checkNowPlayingWithDuration(
	albumName: string, 
	artistName: string
): Promise<{ isNowPlaying: boolean; nowPlayingTrack?: string } | null> {
	try {
		// Check cache for Apple Music data
		const cacheKey = `apple:album:${artistName}:${albumName}`
		const cached = await redis.get(cacheKey)
		
		if (!cached) {
			// Try to fetch from Apple Music if not cached
			const appleMusicAlbum = await findAlbum(artistName, albumName)
			if (!appleMusicAlbum) return null
			
			const transformedData = await transformAlbumData(appleMusicAlbum)
			await redis.set(cacheKey, JSON.stringify(transformedData), 'EX', 86400)
			return checkWithTracks(albumName, transformedData.tracks)
		}
		
		const appleMusicData = JSON.parse(cached)
		return checkWithTracks(albumName, appleMusicData.tracks)
	} catch (error) {
		console.error(`Error checking duration for ${albumName}:`, error)
		return null
	}
}

function checkWithTracks(
	albumName: string, 
	tracks?: Array<{ name: string; durationMs?: number }>
): { isNowPlaying: boolean; nowPlayingTrack?: string } | null {
	if (!tracks) return null
	
	const now = new Date()
	const SCROBBLE_LAG = 3 * 60 * 1000 // 3 minutes
	
	for (const trackInfo of recentTracks) {
		if (trackInfo.albumName !== albumName) continue
		
		const trackData = tracks.find(t => 
			t.name.toLowerCase() === trackInfo.trackName.toLowerCase()
		)
		
		if (trackData?.durationMs) {
			const trackEndTime = new Date(trackInfo.scrobbleTime.getTime() + trackData.durationMs + SCROBBLE_LAG)
			
			if (now < trackEndTime) {
				return {
					isNowPlaying: true,
					nowPlayingTrack: trackInfo.trackName
				}
			}
		}
	}
	
	return { isNowPlaying: false }
}