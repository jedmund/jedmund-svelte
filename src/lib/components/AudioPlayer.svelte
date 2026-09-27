<script lang="ts">
	import AudioVolumeButton from './public/AudioVolumeButton.svelte'
	import { onDestroy } from 'svelte'
	import { createAudioPlayer } from '$lib/public/audio-player.svelte'

	interface Props {
		src: string
		title?: string
		waveformData?: number[] | null
		onWaveformComputed?: (data: number[]) => void
	}

	let { src, waveformData = null, onWaveformComputed }: Props = $props()

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

	// White pill width
	// 8px left pad + 32px play + 4px gap + 32px timestamp + 8px gap + waveform + 8px right pad
	const PILL_WIDTH = 8 + 32 + 4 + 32 + 8 + waveformWidth + 8

	const audio = createAudioPlayer(() => ({ src, waveformData, onWaveformComputed }))
	onDestroy(() => audio.dispose())
</script>

<div class="audio-player" bind:this={containerEl}>
	<audio
		bind:this={audio.audioEl}
		{src}
		preload="metadata"
		ontimeupdate={audio.onTimeUpdate}
		onloadedmetadata={audio.onLoadedMetadata}
		ondurationchange={audio.onDurationChange}
		onplay={audio.onPlay}
		onpause={audio.onPause}
		onended={audio.onEnded}
	></audio>

	<div class="outer-pill">
		<!-- White pill (animated width) -->
		<div class="white-pill" style="width: {PILL_WIDTH}px"></div>

		<!-- Content layer -->
		<div class="content-layer">
			<!-- Play/Pause button -->
			<button
				class="play-button"
				onclick={audio.togglePlay}
				aria-label={audio.playing ? 'Pause' : 'Play'}
			>
				{#if audio.playing}
					<!-- Pause icon: two red bars -->
					<svg width="12" height="14" viewBox="0 0 12 14" fill="none">
						<rect x="0" y="1" width="4" height="12" rx="1" fill="var(--audio-accent)" />
						<rect x="8" y="1" width="4" height="12" rx="1" fill="var(--audio-accent)" />
					</svg>
				{:else}
					<!-- Play icon: red triangle -->
					<svg width="12" height="14" viewBox="0 0 12 14" fill="none">
						<path
							d="M1 1.5V12.5C1 13.1 1.5 13.4 2 13.1L11.5 7.6C12 7.3 12 6.7 11.5 6.4L2 0.9C1.5 0.6 1 0.9 1 1.5Z"
							fill="var(--audio-accent)"
						/>
					</svg>
				{/if}
			</button>

			<!-- Timestamp -->
			<span class="timestamp">{audio.timestamp}</span>

			<!-- Waveform -->
			<div class="waveform-container">
				<svg
					class="waveform"
					width={waveformWidth}
					height={BAR_MAX_HEIGHT}
					viewBox="0 0 {waveformWidth} {BAR_MAX_HEIGHT}"
					onpointerdown={audio.handleWaveformPointerDown}
					onpointermove={audio.handleWaveformPointerMove}
					onpointerup={audio.handleWaveformPointerUp}
				>
					{#each audio.bars as barValue, i}
						{@const barHeight = Math.max(BAR_MIN_HEIGHT, barValue * BAR_MAX_HEIGHT)}
						{@const x = i * (BAR_WIDTH + BAR_GAP)}
						{@const y = (BAR_MAX_HEIGHT - barHeight) / 2}
						{@const barProgress = (i + 0.5) / BAR_COUNT}
						{@const isPlayed = barProgress <= audio.progress}
						<rect
							{x}
							{y}
							width={BAR_WIDTH}
							height={barHeight}
							rx="1.5"
							class="bar"
							class:played={isPlayed && audio.playing}
							class:unplayed={!isPlayed && audio.playing}
							class:paused={!audio.playing && !audio.scrubbing}
							class:scrub-played={isPlayed && audio.scrubbing && !audio.playing}
							class:scrub-unplayed={!isPlayed && audio.scrubbing && !audio.playing}
						/>
					{/each}
				</svg>
			</div>

			<AudioVolumeButton muted={audio.muted} volume={audio.volume} ontoggle={audio.toggleMute} />
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
</style>
