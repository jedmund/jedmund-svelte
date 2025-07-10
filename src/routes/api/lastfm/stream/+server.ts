import { LastClient } from '@musicorum/lastfm'
import type { RequestHandler } from './$types'
import { LastfmStreamManager } from '$lib/utils/lastfmStreamManager'
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
			const streamManager = new LastfmStreamManager(client, USERNAME)
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

					// Check if music is playing
					let musicIsPlaying = false

					// Send album updates if any
					if (update.albums && !isClosed) {
						try {
							const data = JSON.stringify(update.albums)
							controller.enqueue(encoder.encode(`event: albums\ndata: ${data}\n\n`))

							const nowPlayingAlbum = update.albums.find((a) => a.isNowPlaying)
							musicIsPlaying = !!nowPlayingAlbum
							
							logger.music('debug', 'Sent album update with now playing status:', {
								totalAlbums: update.albums.length,
								nowPlayingAlbum: nowPlayingAlbum
									? `${nowPlayingAlbum.artist.name} - ${nowPlayingAlbum.name}`
									: 'none'
							})
						} catch (e) {
							isClosed = true
						}
					}

					// Send now playing updates if any
					if (update.nowPlayingUpdates && update.nowPlayingUpdates.length > 0 && !isClosed) {
						try {
							const data = JSON.stringify(update.nowPlayingUpdates)
							controller.enqueue(encoder.encode(`event: nowplaying\ndata: ${data}\n\n`))
							
							// Check if any of the updates indicate music is playing
							musicIsPlaying = musicIsPlaying || update.nowPlayingUpdates.some(u => u.isNowPlaying)
						} catch (e) {
							isClosed = true
						}
					}

					// Adjust polling interval based on playing state
					if (musicIsPlaying !== isPlaying) {
						isPlaying = musicIsPlaying
						const newInterval = isPlaying ? FAST_UPDATE_INTERVAL : UPDATE_INTERVAL
						
						if (newInterval !== currentInterval) {
							currentInterval = newInterval
							logger.music('debug', `Adjusting polling interval to ${currentInterval}ms (playing: ${isPlaying})`)
							
							// Reset interval with new timing
							if (intervalId) {
								clearInterval(intervalId)
								intervalId = setInterval(checkForUpdates, currentInterval)
							}
						}
					}

					// Send heartbeat to keep connection alive
					if (!isClosed) {
						try {
							controller.enqueue(encoder.encode('event: heartbeat\ndata: {}\n\n'))
						} catch (e) {
							// This is expected when client disconnects
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
