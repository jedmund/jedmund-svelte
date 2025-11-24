import { writable, derived, get, type Readable } from 'svelte/store'
import { browser } from '$app/environment'
import type { Album } from '$lib/types/lastfm'

interface MusicStreamState {
	connected: boolean
	albums: Album[]
	lastUpdate: Date | null
}

function createMusicStream() {
	const { subscribe, update } = writable<MusicStreamState>({
		connected: false,
		albums: [],
		lastUpdate: null
	})

	let eventSource: EventSource | null = null
	let reconnectTimeout: NodeJS.Timeout | null = null
	let reconnectAttempts = 0

	function connect() {
		if (!browser || eventSource?.readyState === EventSource.OPEN) return

		// Don't connect in Storybook or admin
		if (typeof window !== 'undefined' && window.parent !== window) {
			console.log('Music stream disabled in Storybook')
			return
		}

		// Clean up existing connection
		disconnect()

		eventSource = new EventSource('/api/lastfm/stream')

		eventSource.addEventListener('connected', () => {
			console.log('Music stream connected')
			reconnectAttempts = 0
			update((state) => ({ ...state, connected: true }))
		})

		eventSource.addEventListener('albums', (event) => {
			try {
				const albums: Album[] = JSON.parse(event.data)
				const nowPlayingAlbum = albums.find((a) => a.isNowPlaying)
				const updateTime = new Date()
				
				console.log('🎵 Music stream update at', updateTime.toLocaleTimeString(), {
					totalAlbums: albums.length,
					nowPlaying: nowPlayingAlbum
						? `${nowPlayingAlbum.artist.name} - ${nowPlayingAlbum.name}`
						: 'none',
					albums: albums.map(a => ({
						name: a.name,
						artist: a.artist.name,
						isNowPlaying: a.isNowPlaying,
						nowPlayingTrack: a.nowPlayingTrack
					}))
				})
				
				update((state) => ({
					...state,
					albums,
					lastUpdate: updateTime
				}))
			} catch (error) {
				console.error('Error parsing albums:', error)
			}
		})

		eventSource.addEventListener('heartbeat', (event) => {
			try {
				const data = JSON.parse(event.data)
				console.log('💓 Heartbeat at', new Date(data.timestamp).toLocaleTimeString(), {
					interval: data.interval,
					hasUpdates: data.hasUpdates
				})
				
				// Update lastUpdate time even on heartbeat to keep countdown in sync
				update((state) => ({
					...state,
					lastUpdate: new Date(data.timestamp)
				}))
			} catch (_error) {
				// Old heartbeat format, ignore
			}
		})

		eventSource.addEventListener('error', (error) => {
			console.error('Music stream error:', error)
			update((state) => ({ ...state, connected: false }))

			// Reconnect with exponential backoff
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
		// Derived store for albums
		albums: derived({ subscribe }, ($state) => $state.albums) as Readable<Album[]>,
		// Helper to check if any album is playing
		nowPlaying: derived({ subscribe }, ($state) => {
			const playing = $state.albums.find(a => a.isNowPlaying)
			return playing ? {
				album: playing,
				track: playing.nowPlayingTrack
			} : null
		}) as Readable<{ album: Album; track?: string } | null>
	}
}

export const musicStream = createMusicStream()
