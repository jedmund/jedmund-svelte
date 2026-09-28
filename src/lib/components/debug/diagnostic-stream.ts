import type { Album } from '$lib/types/lastfm'

export interface DiagnosticStreamState {
	albums: Album[]
	connected: boolean
	lastUpdate: Date | null
}
export interface DiagnosticState extends DiagnosticStreamState {
	nowPlaying: { album: Album; track?: string } | null
	updateFlash: boolean
	nextUpdateIn: number
	updateInterval: number
	trackRemainingTime: number
}

export function trackTiming(albums: Album[], now = Date.now()) {
	const album = albums.find((item) => item.isNowPlaying)
	if (!album?.nowPlayingTrack || !album.appleMusicData?.tracks || !album.lastScrobbleTime) {
		return { trackRemainingTime: 0, updateInterval: 30 }
	}
	const track = album.appleMusicData.tracks.find((item) => item.name === album.nowPlayingTrack)
	if (!track?.durationMs) return { trackRemainingTime: 0, updateInterval: 10 }
	const remaining = Math.max(
		0,
		track.durationMs - (now - new Date(album.lastScrobbleTime).getTime())
	)
	return {
		trackRemainingTime: Math.round(remaining / 1000),
		updateInterval: remaining < 20000 ? 5 : remaining < 60000 ? 10 : 15
	}
}

export function formatDiagnosticTime(seconds: number) {
	return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

/** A single subscription and owned timers; disabled callers allocate neither. */
export function observeDiagnostics(
	enabled: boolean,
	subscribe: (update: (state: DiagnosticStreamState) => void) => () => void,
	update: (state: DiagnosticState) => void
) {
	if (!enabled) return () => {}
	let flashTimer: ReturnType<typeof setTimeout> | undefined
	let state: DiagnosticState = {
		albums: [],
		connected: false,
		lastUpdate: null,
		nowPlaying: null,
		updateFlash: false,
		nextUpdateIn: 30,
		updateInterval: 30,
		trackRemainingTime: 0
	}
	const unsubscribe = subscribe((stream) => {
		const changed = stream.lastUpdate && stream.lastUpdate.getTime() !== state.lastUpdate?.getTime()
		const album = stream.albums.find((item) => item.isNowPlaying)
		state = {
			...state,
			...stream,
			...trackTiming(stream.albums),
			nowPlaying: album ? { album, track: album.nowPlayingTrack } : null,
			updateFlash: Boolean(changed) || state.updateFlash
		}
		if (changed) {
			clearTimeout(flashTimer)
			flashTimer = setTimeout(() => {
				state = { ...state, updateFlash: false }
				update(state)
			}, 500)
		}
		tick()
	})
	function tick() {
		const elapsed = state.lastUpdate ? Date.now() - state.lastUpdate.getTime() : 0
		state = {
			...state,
			nextUpdateIn: Math.max(0, Math.ceil(state.updateInterval - elapsed / 1000))
		}
		update(state)
	}
	const timer = setInterval(tick, 1000)
	return () => {
		unsubscribe()
		clearInterval(timer)
		clearTimeout(flashTimer)
	}
}
