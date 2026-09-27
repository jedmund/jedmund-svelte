import { onMount } from 'svelte'
import { musicStream } from '$lib/stores/music-stream'
import { observeDiagnostics, type DiagnosticState } from './diagnostic-stream'

export function useDebugDiagnostics() {
	let state = $state<DiagnosticState>({
		albums: [],
		connected: false,
		lastUpdate: null,
		nowPlaying: null,
		updateFlash: false,
		nextUpdateIn: 30,
		updateInterval: 30,
		trackRemainingTime: 0
	})
	onMount(() =>
		observeDiagnostics(true, musicStream.subscribe, (next) => {
			state = next
		})
	)
	return {
		get state() {
			return state
		}
	}
}
