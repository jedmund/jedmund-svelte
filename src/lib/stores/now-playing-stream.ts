import { writable, derived, get, type Readable } from 'svelte/store'
import { browser } from '$app/environment'

interface NowPlayingUpdate {
	albumName: string
	artistName: string
	isNowPlaying: boolean
	nowPlayingTrack?: string
}

interface NowPlayingState {
	connected: boolean
	updates: Map<string, NowPlayingUpdate>
	lastUpdate: Date | null
}

function createNowPlayingStream() {
	const { subscribe, set, update } = writable<NowPlayingState>({
		connected: false,
		updates: new Map(),
		lastUpdate: null
	})

	let eventSource: EventSource | null = null
	let reconnectTimeout: NodeJS.Timeout | null = null
	let reconnectAttempts = 0

	function connect() {
		if (!browser || eventSource?.readyState === EventSource.OPEN) return

		// Don't connect in Storybook
		if (typeof window !== 'undefined' && window.parent !== window) {
			// We're in an iframe, likely Storybook
			console.log('Now Playing stream disabled in Storybook')
			return
		}

		// Clean up existing connection
		disconnect()

		eventSource = new EventSource('/api/lastfm/stream')

		eventSource.addEventListener('connected', () => {
			console.log('Now Playing stream connected')
			reconnectAttempts = 0
			update((state) => ({ ...state, connected: true }))
		})

		eventSource.addEventListener('nowplaying', (event) => {
			try {
				const updates: NowPlayingUpdate[] = JSON.parse(event.data)
				update((state) => {
					const newUpdates = new Map(state.updates)

					for (const album of updates) {
						const key = `${album.artistName}:${album.albumName}`
						newUpdates.set(key, album)
					}

					return {
						...state,
						updates: newUpdates,
						lastUpdate: new Date()
					}
				})
			} catch (error) {
				console.error('Error parsing now playing update:', error)
			}
		})

		eventSource.addEventListener('heartbeat', () => {
			// Heartbeat received, connection is healthy
		})

		eventSource.addEventListener('error', (error) => {
			console.error('Now Playing stream error:', error)
			update((state) => ({ ...state, connected: false }))

			// Attempt to reconnect with exponential backoff
			if (reconnectAttempts < 5) {
				const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000)
				reconnectTimeout = setTimeout(() => {
					reconnectAttempts++
					connect()
				}, delay)
			}
		})

		eventSource.addEventListener('open', () => {
			update((state) => ({ ...state, connected: true }))
		})
	}

	function disconnect() {
		if (eventSource) {
			eventSource.close()
			eventSource = null
		}

		if (reconnectTimeout) {
			clearTimeout(reconnectTimeout)
			reconnectTimeout = null
		}

		update((state) => ({ ...state, connected: false }))
	}

	// Auto-connect in browser (but not in admin)
	if (browser && !window.location.pathname.startsWith('/admin')) {
		connect()

		// Reconnect on visibility change
		document.addEventListener('visibilitychange', () => {
			const currentState = get({ subscribe })
			if (
				document.visibilityState === 'visible' &&
				!currentState.connected &&
				!window.location.pathname.startsWith('/admin')
			) {
				connect()
			}
		})
	}

	return {
		subscribe,
		connect,
		disconnect,
		// Helper to check if a specific album is now playing
		isAlbumPlaying: derived({ subscribe }, ($state) => (artistName: string, albumName: string) => {
			const key = `${artistName}:${albumName}`
			const update = $state.updates.get(key)
			return update
				? {
						isNowPlaying: update.isNowPlaying,
						nowPlayingTrack: update.nowPlayingTrack
					}
				: null
		}) as Readable<
			(
				artistName: string,
				albumName: string
			) => { isNowPlaying: boolean; nowPlayingTrack?: string } | null
		>
	}
}

export const nowPlayingStream = createNowPlayingStream()
