import { extractWaveformData, generateDefaultWaveform } from '$lib/utils/waveform'
export function createAudioPlayer(
	options: () => {
		src: string
		waveformData: number[] | null
		onWaveformComputed?: (data: number[]) => void
	}
) {
	// Audio state
	let audioEl: HTMLAudioElement | undefined = $state()
	let playing = $state(false)
	let currentTime = $state(0)
	let duration = $state(0)
	let volume = $state(1)
	let muted = $state(false)
	let previousVolume = $state(1)
	let scrubbing = $state(false)

	// Waveform data
	let bars = $state<number[]>(options().waveformData ?? generateDefaultWaveform())

	// Progress fraction
	const progress = $derived(duration > 0 ? currentTime / duration : 0)

	// Format time as m:ss
	function formatTime(seconds: number): string {
		if (!isFinite(seconds) || seconds < 0) return '0:00'
		const m = Math.floor(seconds / 60)
		const s = Math.floor(seconds % 60)
		return `${m}:${s.toString().padStart(2, '0')}`
	}

	// Displayed timestamp
	const timestamp = $derived(playing ? formatTime(currentTime) : formatTime(duration))

	// Play/pause
	function togglePlay() {
		if (!audioEl) return

		if (playing) {
			audioEl.pause()
		} else {
			// Pause all other audio players on the page
			document.querySelectorAll('audio').forEach((el) => {
				if (el !== audioEl) el.pause()
			})
			audioEl.play().catch(() => {
				playing = false
			})
		}
	}

	// Volume toggle (mute/unmute)
	function toggleMute() {
		if (!audioEl) return

		if (muted) {
			muted = false
			volume = previousVolume || 1
			audioEl.volume = volume
			audioEl.muted = false
		} else {
			previousVolume = volume
			muted = true
			audioEl.volume = 0
			audioEl.muted = true
		}
	}

	// Waveform scrubbing
	function handleWaveformPointerDown(e: PointerEvent) {
		scrubbing = true
		seekFromPointer(e)
		;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
	}

	function handleWaveformPointerMove(e: PointerEvent) {
		if (!scrubbing) return
		seekFromPointer(e)
	}

	function handleWaveformPointerUp() {
		scrubbing = false
	}

	function seekFromPointer(e: PointerEvent) {
		if (!audioEl) return
		const svg = e.currentTarget as SVGSVGElement
		const rect = svg.getBoundingClientRect()
		const x = e.clientX - rect.left
		const fraction = Math.max(0, Math.min(1, x / rect.width))
		audioEl.currentTime = fraction * duration
	}

	// Audio event handlers
	function onTimeUpdate() {
		if (audioEl) currentTime = audioEl.currentTime
	}

	function onLoadedMetadata() {
		if (audioEl) duration = audioEl.duration
	}

	function onDurationChange() {
		if (audioEl) duration = audioEl.duration
	}

	function onPlay() {
		playing = true
	}

	function onPause() {
		playing = false
	}

	function onEnded() {
		playing = false
		currentTime = 0
	}

	$effect(() => {
		const { src, waveformData, onWaveformComputed } = options()
		bars = waveformData ?? generateDefaultWaveform()
		if (waveformData || !src) return
		const abort = new AbortController()
		extractWaveformData(src, 48, abort.signal)
			.then((data) => {
				if (abort.signal.aborted) return
				bars = data
				onWaveformComputed?.(data)
			})
			.catch(() => {
				/* Keep the placeholder when audio cannot be decoded. */
			})
		return () => abort.abort()
	})

	return {
		get scrubbing() {
			return scrubbing
		},
		get audioEl() {
			return audioEl
		},
		get playing() {
			return playing
		},
		get currentTime() {
			return currentTime
		},
		get duration() {
			return duration
		},
		get volume() {
			return volume
		},
		get muted() {
			return muted
		},
		get bars() {
			return bars
		},
		get progress() {
			return progress
		},
		get timestamp() {
			return timestamp
		},
		set audioEl(value: HTMLAudioElement | undefined) {
			audioEl = value
		},
		togglePlay,
		toggleMute,
		handleWaveformPointerDown,
		handleWaveformPointerMove,
		handleWaveformPointerUp,
		onTimeUpdate,
		onLoadedMetadata,
		onDurationChange,
		onPlay,
		onPause,
		onEnded,
		dispose() {
			audioEl?.pause()
		}
	}
}
