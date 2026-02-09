import { LastClient } from '@musicorum/lastfm'
import type { RequestHandler } from './$types'
import { SimpleLastfmStreamManager } from '$lib/utils/simpleLastfmStreamManager'
import { logger } from '$lib/server/logger'
import { getConfig } from '$lib/server/config'

const USERNAME = 'jedmund'
const UPDATE_INTERVAL = 30000 // 30 seconds default
const FAST_UPDATE_INTERVAL = 10000 // 10 seconds when music is playing

export const GET: RequestHandler = async ({ request }) => {
	const encoder = new TextEncoder()

	const stream = new ReadableStream({
		async start(controller) {
			const apiKey = await getConfig('lastfm.api_key')
			const client = new LastClient(apiKey || '')
			const streamManager = new SimpleLastfmStreamManager(client, USERNAME)
			let intervalId: NodeJS.Timeout | null = null
			let isClosed = false
			let currentInterval = UPDATE_INTERVAL

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

					if (update.albums && !isClosed) {
						try {
							const data = JSON.stringify(update.albums)
							controller.enqueue(encoder.encode(`event: albums\ndata: ${data}\n\n`))

							const nowPlayingAlbum = update.albums.find((a) => a.isNowPlaying)
							const musicIsPlaying = !!nowPlayingAlbum
							
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
								remainingMs: remainingMs
							})

							let targetInterval = UPDATE_INTERVAL
							
							if (musicIsPlaying && remainingMs > 0) {
								if (remainingMs < 20000) {
									targetInterval = 5000
								} else if (remainingMs < 60000) {
									targetInterval = 10000
								} else {
									targetInterval = 15000
								}
							} else if (musicIsPlaying) {
								targetInterval = FAST_UPDATE_INTERVAL
							}
							
							if (Math.abs(targetInterval - currentInterval) > 1000) {
								currentInterval = targetInterval
								logger.music('debug', `Adjusting interval to ${currentInterval}ms (playing: ${musicIsPlaying}, remaining: ${Math.round(remainingMs/1000)}s)`)
								
								if (intervalId) {
									clearInterval(intervalId)
									intervalId = setInterval(checkForUpdates, currentInterval)
								}
							}
						} catch (_e) {
							isClosed = true
						}
					}

					if (!isClosed) {
						try {
							const heartbeatData = JSON.stringify({
								timestamp: new Date().toISOString(),
								interval: currentInterval,
								hasUpdates: !!update.albums
							})
							controller.enqueue(encoder.encode(`event: heartbeat\ndata: ${heartbeatData}\n\n`))
						} catch (_e) {
							isClosed = true
						}
					}
				} catch (error) {
					logger.error('Error checking for updates:', error as Error, undefined, 'music')
				}
			}

			await checkForUpdates()
			intervalId = setInterval(checkForUpdates, currentInterval)

			request.signal.addEventListener('abort', () => {
				isClosed = true
				if (intervalId) {
					clearInterval(intervalId)
				}
				try {
					controller.close()
				} catch (_e) {
					// controller already closed
				}
			})
		},

		cancel() {
			logger.music('debug', 'SSE stream cancelled')
		}
	})

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no'
		}
	})
}
