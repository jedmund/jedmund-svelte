import { LastClient } from '@musicorum/lastfm'
import type { RequestHandler } from './$types'
import type { Album, AlbumImages } from '$lib/types/lastfm'
import type { LastfmImage } from '@musicorum/lastfm/dist/types/packages/common'
import { findAlbum, transformAlbumData } from '$lib/server/apple-music-client'
import redis from '../../redis-client'

const LASTFM_API_KEY = process.env.LASTFM_API_KEY
const USERNAME = 'jedmund'
const UPDATE_INTERVAL = 30000 // 30 seconds to reduce API load

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
			let lastNowPlayingState: Map<string, { isPlaying: boolean; track?: string }> = new Map()
			let lastAlbumOrder: string[] = [] // Track album order changes
			let intervalId: NodeJS.Timeout | null = null
			let isClosed = false

			// Send initial connection message
			try {
				controller.enqueue(encoder.encode('event: connected\ndata: {}\n\n'))
			} catch (e) {
				console.error('Failed to send initial message:', e)
				return
			}

			const checkForUpdates = async () => {
				if (isClosed) {
					if (intervalId) {
						clearInterval(intervalId)
					}
					return
				}

				try {
					// Fetch full album data
					const albums = await getRecentAlbums(client)
					
					// Enrich albums with additional info
					const enrichedAlbums = await Promise.all(
						albums.map(async (album) => {
							try {
								const enriched = await enrichAlbumWithInfo(client, album)
								return await searchAppleMusicForAlbum(enriched)
							} catch (error) {
								console.error(`Error enriching album ${album.name}:`, error)
								return album
							}
						})
					)

					// Check if album order has changed
					const currentAlbumOrder = enrichedAlbums.map(a => `${a.artist.name}:${a.name}`)
					const albumOrderChanged = JSON.stringify(currentAlbumOrder) !== JSON.stringify(lastAlbumOrder)
					
					if (albumOrderChanged) {
						lastAlbumOrder = currentAlbumOrder
						// Send full album update
						if (!isClosed) {
							try {
								const data = JSON.stringify(enrichedAlbums)
								controller.enqueue(encoder.encode(`event: albums\ndata: ${data}\n\n`))
							} catch (e) {
								isClosed = true
							}
						}
					}

					// Now playing updates
					const nowPlayingAlbums = await getNowPlayingAlbums(client)
					const updates: NowPlayingUpdate[] = []
					const currentAlbums = new Set<string>()

					// Check for changes
					for (const album of nowPlayingAlbums) {
						const key = `${album.artistName}:${album.albumName}`
						currentAlbums.add(key)

						const lastState = lastNowPlayingState.get(key)
						const wasPlaying = lastState?.isPlaying || false
						const lastTrack = lastState?.track

						// Update if playing status changed OR if the track changed
						if (
							album.isNowPlaying !== wasPlaying ||
							(album.isNowPlaying && album.nowPlayingTrack !== lastTrack)
						) {
							updates.push(album)
							console.log(
								`Update for ${album.albumName}: playing=${album.isNowPlaying}, track=${album.nowPlayingTrack}`
							)
						}

						lastNowPlayingState.set(key, {
							isPlaying: album.isNowPlaying,
							track: album.nowPlayingTrack
						})
					}

					// Check for albums that were in the list but aren't anymore (stopped playing)
					for (const [key, state] of lastNowPlayingState.entries()) {
						if (!currentAlbums.has(key) && state.isPlaying) {
							const [artistName, albumName] = key.split(':')
							updates.push({
								albumName,
								artistName,
								isNowPlaying: false
							})
							console.log(`Album no longer in recent: ${albumName}`)
							lastNowPlayingState.delete(key)
						}
					}

					// Check if controller is still open before sending
					if (!isClosed) {
						// Send updates if any
						if (updates.length > 0) {
							const data = JSON.stringify(updates)
							try {
								controller.enqueue(encoder.encode(`event: nowplaying\ndata: ${data}\n\n`))
							} catch (e) {
								// This is expected when client disconnects
								isClosed = true
							}
						}

						// Send heartbeat to keep connection alive
						try {
							controller.enqueue(encoder.encode('event: heartbeat\ndata: {}\n\n'))
						} catch (e) {
							// This is expected when client disconnects
							isClosed = true
						}
					}
				} catch (error) {
					console.error('Error checking for updates:', error)
				}
			}

			// Initial check
			await checkForUpdates()

			// Set up interval
			intervalId = setInterval(checkForUpdates, UPDATE_INTERVAL)

			// Handle client disconnect
			request.signal.addEventListener('abort', () => {
				isClosed = true
				if (intervalId) {
					clearInterval(intervalId)
				}
				try {
					controller.close()
				} catch (e) {
					// Already closed
				}
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
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no' // Disable Nginx buffering
		}
	})
}

async function getNowPlayingAlbums(client: LastClient): Promise<NowPlayingUpdate[]> {
	// Check cache for recent tracks
	const cacheKey = `lastfm:recent:${USERNAME}`
	const cached = await redis.get(cacheKey)

	let recentTracksResponse
	if (cached) {
		console.log('Using cached Last.fm recent tracks for streaming')
		recentTracksResponse = JSON.parse(cached)
		// Convert date strings back to Date objects
		if (recentTracksResponse.tracks) {
			recentTracksResponse.tracks = recentTracksResponse.tracks.map((track: any) => ({
				...track,
				date: track.date ? new Date(track.date) : undefined
			}))
		}
	} else {
		console.log('Fetching fresh Last.fm recent tracks for streaming')
		recentTracksResponse = await client.user.getRecentTracks(USERNAME, {
			limit: 50,
			extended: true
		})
		// Cache for 30 seconds - reasonable for "recent" data
		await redis.set(cacheKey, JSON.stringify(recentTracksResponse), 'EX', 30)
	}

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

	// Clean up old tracks first
	recentTracks = recentTracks.filter((track) => {
		// Keep tracks from last hour only
		const hourAgo = new Date(now.getTime() - 60 * 60 * 1000)
		return track.scrobbleTime > hourAgo
	})

	// Find the most recent track from this album
	let mostRecentTrack: TrackPlayInfo | null = null
	for (const trackInfo of recentTracks) {
		if (trackInfo.albumName === albumName) {
			if (!mostRecentTrack || trackInfo.scrobbleTime > mostRecentTrack.scrobbleTime) {
				mostRecentTrack = trackInfo
			}
		}
	}

	if (mostRecentTrack) {
		const trackData = tracks.find(
			(t) => t.name.toLowerCase() === mostRecentTrack.trackName.toLowerCase()
		)

		if (trackData?.durationMs) {
			const trackEndTime = new Date(
				mostRecentTrack.scrobbleTime.getTime() + trackData.durationMs + SCROBBLE_LAG
			)

			if (now < trackEndTime) {
				console.log(
					`Track "${mostRecentTrack.trackName}" is still playing (ends at ${trackEndTime.toLocaleTimeString()})`
				)
				return {
					isNowPlaying: true,
					nowPlayingTrack: mostRecentTrack.trackName
				}
			}
		}
	}

	return { isNowPlaying: false }
}

// Helper functions for album data
function transformImages(images: LastfmImage[]): AlbumImages {
	const imageMap: AlbumImages = {
		small: '',
		medium: '',
		large: '',
		extralarge: '',
		mega: '',
		default: ''
	}

	for (const image of images) {
		const size = image.size as keyof AlbumImages
		if (size in imageMap) {
			imageMap[size] = image.url
		}
	}

	return imageMap
}

async function enrichAlbumWithInfo(client: LastClient, album: Album): Promise<Album> {
	// Check cache for album info
	const cacheKey = `lastfm:albuminfo:${album.artist.name}:${album.name}`
	const cached = await redis.get(cacheKey)

	if (cached) {
		console.log(`Using cached album info for "${album.name}"`)
		const albumInfo = JSON.parse(cached)
		return {
			...album,
			url: albumInfo?.url || '',
			images: transformImages(albumInfo?.images || [])
		}
	}

	console.log(`Fetching fresh album info for "${album.name}"`)
	const albumInfo = await client.album.getInfo(album.name, album.artist.name)

	// Cache for 1 hour - album info rarely changes
	await redis.set(cacheKey, JSON.stringify(albumInfo), 'EX', 3600)

	return {
		...album,
		url: albumInfo?.url || '',
		images: transformImages(albumInfo?.images || [])
	}
}

async function searchAppleMusicForAlbum(album: Album): Promise<Album> {
	try {
		// Check cache first
		const cacheKey = `apple:album:${album.artist.name}:${album.name}`
		const cached = await redis.get(cacheKey)

		if (cached) {
			const cachedData = JSON.parse(cached)
			return {
				...album,
				images: {
					...album.images,
					itunes: cachedData.highResArtwork || album.images.itunes
				},
				appleMusicData: cachedData
			}
		}

		// Search Apple Music
		const appleMusicAlbum = await findAlbum(album.artist.name, album.name)

		if (appleMusicAlbum) {
			const transformedData = await transformAlbumData(appleMusicAlbum)

			// Cache the result for 24 hours
			await redis.set(cacheKey, JSON.stringify(transformedData), 'EX', 86400)

			return {
				...album,
				images: {
					...album.images,
					itunes: transformedData.highResArtwork || album.images.itunes
				},
				appleMusicData: transformedData
			}
		}
	} catch (error) {
		console.error(
			`Failed to fetch Apple Music data for "${album.name}" by "${album.artist.name}":`,
			error
		)
	}

	// Return album unchanged if Apple Music search fails
	return album
}

async function getRecentAlbums(
	client: LastClient,
	limit: number = 4
): Promise<Album[]> {
	// Check cache for recent tracks
	const cacheKey = `lastfm:recent:${USERNAME}`
	const cached = await redis.get(cacheKey)

	let recentTracksResponse
	if (cached) {
		console.log('Using cached Last.fm recent tracks for album stream')
		recentTracksResponse = JSON.parse(cached)
		// Convert date strings back to Date objects
		if (recentTracksResponse.tracks) {
			recentTracksResponse.tracks = recentTracksResponse.tracks.map((track: any) => ({
				...track,
				date: track.date ? new Date(track.date) : undefined
			}))
		}
	} else {
		console.log('Fetching fresh Last.fm recent tracks for album stream')
		recentTracksResponse = await client.user.getRecentTracks(USERNAME, {
			limit: 50,
			extended: true
		})
		// Cache for 30 seconds - reasonable for "recent" data
		await redis.set(cacheKey, JSON.stringify(recentTracksResponse), 'EX', 30)
	}

	const uniqueAlbums = new Map<string, Album>()

	for (const track of recentTracksResponse.tracks) {
		if (uniqueAlbums.size >= limit) break

		const albumKey = `${track.album.mbid || track.album.name}`
		if (!uniqueAlbums.has(albumKey)) {
			uniqueAlbums.set(albumKey, {
				name: track.album.name,
				artist: {
					name: track.artist.name,
					mbid: track.artist.mbid || ''
				},
				playCount: 1,
				images: transformImages(track.images),
				mbid: track.album.mbid || '',
				url: track.url,
				rank: uniqueAlbums.size + 1,
				isNowPlaying: track.nowPlaying || false,
				nowPlayingTrack: track.nowPlaying ? track.name : undefined
			})
		} else if (track.nowPlaying) {
			// If album already exists but this track is now playing, update it
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
