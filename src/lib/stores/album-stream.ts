import { writable, derived, get, type Readable } from 'svelte/store'
import { browser } from '$app/environment'
import type { Album } from '$lib/types/lastfm'

interface AlbumStreamState {
	connected: boolean
	albums: Album[]
	lastUpdate: Date | null
}

function createAlbumStream() {
	const { subscribe, set, update } = writable<AlbumStreamState>({
		connected: false,
		albums: [],
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
			console.log('Album stream disabled in Storybook')
			return
		}

		// Clean up existing connection
		disconnect()

		eventSource = new EventSource('/api/lastfm/stream')

		eventSource.addEventListener('connected', () => {
			console.log('Album stream connected')
			reconnectAttempts = 0
			update((state) => ({ ...state, connected: true }))
		})

		eventSource.addEventListener('albums', (event) => {
			try {
				const albums: Album[] = JSON.parse(event.data)
				const nowPlayingAlbum = albums.find(a => a.isNowPlaying)
				console.log('Album stream received albums:', {
					totalAlbums: albums.length,
					nowPlayingAlbum: nowPlayingAlbum ? `${nowPlayingAlbum.artist.name} - ${nowPlayingAlbum.name}` : 'none'
				})
				update((state) => ({
					...state,
					albums,
					lastUpdate: new Date()
				}))
			} catch (error) {
				console.error('Error parsing albums update:', error)
			}
		})

		eventSource.addEventListener('heartbeat', () => {
			// Heartbeat received, connection is healthy
		})

		eventSource.addEventListener('error', (error) => {
			console.error('Album stream error:', error)
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

	// Auto-connect in browser
	if (browser) {
		connect()

		// Reconnect on visibility change
		document.addEventListener('visibilitychange', () => {
			const currentState = get({ subscribe })
			if (document.visibilityState === 'visible' && !currentState.connected) {
				connect()
			}
		})
	}

	return {
		subscribe,
		connect,
		disconnect,
		// Derived store for just the albums
		albums: derived({ subscribe }, ($state) => $state.albums) as Readable<Album[]>
	}
}

export const albumStream = createAlbumStream()