<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import { extractWaveformData, generateDefaultWaveform } from '$lib/utils/waveform'

	interface Props {
		src: string
		title?: string
		waveformData?: number[] | null
		onWaveformComputed?: (data: number[]) => void
	}

	let {
		src,
		waveformData = null,
		onWaveformComputed
	}: Props = $props()

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
	let bars = $state<number[]>(waveformData ?? generateDefaultWaveform())

	// Container ref for responsive bar count
	let containerEl: HTMLDivElement | undefined = $state()

	// Bar count — default 48, could adapt on narrow screens
	const BAR_COUNT = 48
	const BAR_WIDTH = 3
	const BAR_GAP = 4 // 7px center-to-center minus 3px width
	const BAR_MIN_HEIGHT = 6
	const BAR_MAX_HEIGHT = 32

	// Computed waveform width (all inputs are constants)
	const waveformWidth = BAR_COUNT * (BAR_WIDTH + BAR_GAP) - BAR_GAP

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

	// White pill width
	// 8px left pad + 32px play + 4px gap + 32px timestamp + 8px gap + waveform + 8px right pad
	const PILL_WIDTH = 8 + 32 + 4 + 32 + 8 + waveformWidth + 8

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
			audioEl.play()
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
		const svg = (e.currentTarget as SVGSVGElement)
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

	// Compute waveform on mount if not provided
	onMount(() => {
		if (!waveformData && src) {
			extractWaveformData(src, BAR_COUNT)
				.then((data) => {
					bars = data
					onWaveformComputed?.(data)
				})
				.catch(() => {
					// Keep the default waveform on error
				})
		}
	})

	// Volume icon arc count: 0 when muted, 1-3 based on volume
	const volumeArcs = $derived.by(() => {
		if (muted || volume === 0) return 0
		if (volume < 0.33) return 1
		if (volume < 0.66) return 2
		return 3
	})
</script>

<div class="audio-player" bind:this={containerEl}>
	<audio
		bind:this={audioEl}
		{src}
		preload="metadata"
		ontimeupdate={onTimeUpdate}
		onloadedmetadata={onLoadedMetadata}
		ondurationchange={onDurationChange}
		onplay={onPlay}
		onpause={onPause}
		onended={onEnded}
	></audio>

	<div class="outer-pill">
		<!-- White pill (animated width) -->
		<div
			class="white-pill"
			style="width: {PILL_WIDTH}px"
		></div>

		<!-- Content layer -->
		<div class="content-layer">
			<!-- Play/Pause button -->
			<button
				class="play-button"
				onclick={togglePlay}
				aria-label={playing ? 'Pause' : 'Play'}
			>
				{#if playing}
					<!-- Pause icon: two red bars -->
					<svg width="12" height="14" viewBox="0 0 12 14" fill="none">
						<rect x="0" y="1" width="4" height="12" rx="1" fill="var(--audio-accent)" />
						<rect x="8" y="1" width="4" height="12" rx="1" fill="var(--audio-accent)" />
					</svg>
				{:else}
					<!-- Play icon: red triangle -->
					<svg width="12" height="14" viewBox="0 0 12 14" fill="none">
						<path d="M1 1.5V12.5C1 13.1 1.5 13.4 2 13.1L11.5 7.6C12 7.3 12 6.7 11.5 6.4L2 0.9C1.5 0.6 1 0.9 1 1.5Z" fill="var(--audio-accent)" />
					</svg>
				{/if}
			</button>

			<!-- Timestamp -->
			<span class="timestamp">{timestamp}</span>

			<!-- Waveform -->
			<div class="waveform-container">
				<svg
					class="waveform"
					width={waveformWidth}
					height={BAR_MAX_HEIGHT}
					viewBox="0 0 {waveformWidth} {BAR_MAX_HEIGHT}"
					onpointerdown={handleWaveformPointerDown}
					onpointermove={handleWaveformPointerMove}
					onpointerup={handleWaveformPointerUp}
				>
					{#each bars as barValue, i}
						{@const barHeight = Math.max(BAR_MIN_HEIGHT, barValue * BAR_MAX_HEIGHT)}
						{@const x = i * (BAR_WIDTH + BAR_GAP)}
						{@const y = (BAR_MAX_HEIGHT - barHeight) / 2}
						{@const barProgress = (i + 0.5) / BAR_COUNT}
						{@const isPlayed = barProgress <= progress}
						<rect
							{x}
							{y}
							width={BAR_WIDTH}
							height={barHeight}
							rx="1.5"
							class="bar"
							class:played={isPlayed && playing}
							class:unplayed={!isPlayed && playing}
							class:paused={!playing && !scrubbing}
							class:scrub-played={isPlayed && scrubbing && !playing}
							class:scrub-unplayed={!isPlayed && scrubbing && !playing}
						/>
					{/each}
				</svg>
			</div>

			<!-- Volume button -->
			<button
				class="volume-button"
				onclick={toggleMute}
				aria-label={muted ? 'Unmute' : 'Mute'}
			>
				<svg width="20" height="18" viewBox="0 0 20 18" fill="none">
					<!-- Speaker body -->
					<path d="M2 6.5H5L9 2.5V15.5L5 11.5H2C1.4 11.5 1 11.1 1 10.5V7.5C1 6.9 1.4 6.5 2 6.5Z" fill="var(--volume-color)" />

					{#if muted || volume === 0}
						<!-- X mark for muted -->
						<line x1="13" y1="6" x2="18" y2="12" stroke="var(--volume-color)" stroke-width="1.5" stroke-linecap="round" />
						<line x1="18" y1="6" x2="13" y2="12" stroke="var(--volume-color)" stroke-width="1.5" stroke-linecap="round" />
					{:else}
						<!-- Volume arcs -->
						{#if volumeArcs >= 1}
							<path d="M12 7.5C12.8 8.3 12.8 9.7 12 10.5" stroke="var(--volume-color)" stroke-width="1.5" stroke-linecap="round" fill="none" />
						{/if}
						{#if volumeArcs >= 2}
							<path d="M14 5.5C15.7 7.2 15.7 10.8 14 12.5" stroke="var(--volume-color)" stroke-width="1.5" stroke-linecap="round" fill="none" />
						{/if}
						{#if volumeArcs >= 3}
							<path d="M16 3.5C18.5 6 18.5 12 16 14.5" stroke="var(--volume-color)" stroke-width="1.5" stroke-linecap="round" fill="none" />
						{/if}
					{/if}
				</svg>
			</button>
		</div>
	</div>


</div>

<style lang="scss">
	.audio-player {
		--audio-accent: #{$red-40};
		--audio-accent-light: #{$red-95};
		--bar-paused: #{$gray-40};
		--volume-color: #{$gray-20};

		display: inline-flex;
		flex-direction: column;
		gap: $unit;
		max-width: 100%;
	}

	.outer-pill {
		position: relative;
		height: 56px;
		background: $gray-80;
		border-radius: $corner-radius-full;
		display: flex;
		align-items: center;
	}

	.white-pill {
		position: absolute;
		left: $unit;
		top: $unit;
		height: 40px;
		background: $white;
		border-radius: 20px;
		pointer-events: none;
	}

	.content-layer {
		position: relative;
		display: flex;
		align-items: center;
		gap: $unit-half;
		z-index: 1;
		height: 40px;
		padding: 0 $unit 0 $unit-2x;
	}

	.play-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: none;
		background: none;
		cursor: pointer;
		padding: 0;
		flex-shrink: 0;
		border-radius: 50%;
		transition: background $transition-fast ease;

		&:hover {
			background: rgba(0, 0, 0, 0.05);
		}
	}

	.timestamp {
		color: var(--audio-accent);
		font-size: $font-size-small;
		font-variant-numeric: tabular-nums;
		font-weight: $font-weight-med;
		min-width: 28px;
		text-align: center;
		flex-shrink: 0;
		user-select: none;
	}

	.waveform-container {
		display: flex;
		align-items: center;
		margin-left: $unit-half;
	}

	.waveform {
		cursor: pointer;
		flex-shrink: 0;
		touch-action: none;
	}

	.bar {
		transition: fill 0.15s ease;

		&.played {
			fill: var(--audio-accent);
		}

		&.unplayed {
			fill: var(--audio-accent-light);
		}

		&.paused {
			fill: var(--bar-paused);
		}

		&.scrub-played {
			fill: var(--audio-accent);
		}

		&.scrub-unplayed {
			fill: var(--audio-accent-light);
		}
	}

	.volume-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: none;
		background: none;
		cursor: pointer;
		padding: 0;
		flex-shrink: 0;
		border-radius: 50%;
		transition: background $transition-fast ease;
		margin-left: $unit-half;

		&:hover {
			background: rgba(0, 0, 0, 0.05);
		}
	}

</style>
