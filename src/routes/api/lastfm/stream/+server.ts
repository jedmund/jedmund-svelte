import { LastClient } from '@musicorum/lastfm'
import type { RequestHandler } from './$types'
import { SimpleLastfmStreamManager } from '$lib/utils/simpleLastfmStreamManager'
import { logger } from '$lib/server/logger'

const LASTFM_API_KEY = process.env.LASTFM_API_KEY
const USERNAME = 'jedmund'
const UPDATE_INTERVAL = 30000 // 30 seconds default
const FAST_UPDATE_INTERVAL = 10000 // 10 seconds when music is playing

export const GET: RequestHandler = async ({ request }) => {
	const encoder = new TextEncoder()

	const stream = new ReadableStream({
		async start(controller) {
			const client = new LastClient(LASTFM_API_KEY || '')
			const streamManager = new SimpleLastfmStreamManager(client, USERNAME)
			let intervalId: NodeJS.Timeout | null = null
			let isClosed = false
			let currentInterval = UPDATE_INTERVAL
			let isPlaying = false

			// Send initial connection message
			try {
				controller.enqueue(encoder.encode('event: connected\ndata: {}\n\n'))
			} catch (e) {
				logger.error('Failed to send initial message:', e as Error, undefined, 'music')
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
					const update = await streamManager.checkForUpdates()

					// Send album updates if any
					if (update.albums && !isClosed) {
						try {
							const data = JSON.stringify(update.albums)
							controller.enqueue(encoder.encode(`event: albums\ndata: ${data}\n\n`))

							// Check if music is playing and calculate smart interval
							const nowPlayingAlbum = update.albums.find((a) => a.isNowPlaying)
							const musicIsPlaying = !!nowPlayingAlbum
							
							// Calculate remaining time if we have track duration
							let remainingMs = 0
							if (nowPlayingAlbum?.nowPlayingTrack && nowPlayingAlbum.appleMusicData?.tracks) {
								const track = nowPlayingAlbum.appleMusicData.tracks.find(
									t => t.name === nowPlayingAlbum.nowPlayingTrack
								)
								
								if (track?.durationMs && nowPlayingAlbum.lastScrobbleTime) {
									const elapsed = Date.now() - new Date(nowPlayingAlbum.lastScrobbleTime).getTime()
									remainingMs = Math.max(0, track.durationMs - elapsed)
								}
							}
							
							logger.music('debug', '📤 SSE: Sent album update:', {
								totalAlbums: update.albums.length,
								nowPlaying: nowPlayingAlbum
									? `${nowPlayingAlbum.artist.name} - ${nowPlayingAlbum.name}`
									: 'none',
								remainingMs: remainingMs,
								albumsWithStatus: update.albums.map(a => ({
									name: a.name,
									artist: a.artist.name,
									isNowPlaying: a.isNowPlaying,
									track: a.nowPlayingTrack
								}))
							})

							// Smart interval adjustment based on remaining track time
							let targetInterval = UPDATE_INTERVAL // Default 30s
							
							if (musicIsPlaying && remainingMs > 0) {
								// If track is ending soon (within 20 seconds), check more frequently
								if (remainingMs < 20000) {
									targetInterval = 5000 // 5 seconds
								}
								// If track has 20-60 seconds left, moderate frequency
								else if (remainingMs < 60000) {
									targetInterval = 10000 // 10 seconds
								}
								// If track has more than 60 seconds, check every 15 seconds
								else {
									targetInterval = 15000 // 15 seconds
								}
							} else if (musicIsPlaying) {
								// If playing but no duration info, use fast interval
								targetInterval = FAST_UPDATE_INTERVAL
							}
							
							// Apply new interval if it changed significantly (more than 1 second difference)
							if (Math.abs(targetInterval - currentInterval) > 1000) {
								currentInterval = targetInterval
								logger.music('debug', `Adjusting interval to ${currentInterval}ms (playing: ${isPlaying}, remaining: ${Math.round(remainingMs/1000)}s)`)
								
								// Reset interval with new timing
								if (intervalId) {
									clearInterval(intervalId)
									intervalId = setInterval(checkForUpdates, currentInterval)
								}
							}
						} catch (e) {
							isClosed = true
						}
					}

					// Always send heartbeat with timestamp to keep client synced
					if (!isClosed) {
						try {
							const heartbeatData = JSON.stringify({
								timestamp: new Date().toISOString(),
								interval: currentInterval,
								hasUpdates: !!update.albums
							})
							controller.enqueue(encoder.encode(`event: heartbeat\ndata: ${heartbeatData}\n\n`))
						} catch (e) {
							// Expected when client disconnects
							isClosed = true
						}
					}
				} catch (error) {
					logger.error('Error checking for updates:', error as Error, undefined, 'music')
				}
			}

			// Initial check
			await checkForUpdates()

			// Set up interval
			intervalId = setInterval(checkForUpdates, currentInterval)

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
			logger.music('debug', 'SSE stream cancelled')
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