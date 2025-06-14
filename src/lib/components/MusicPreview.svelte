<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import { fade } from 'svelte/transition'

	interface Props {
		previewUrl: string
		albumName?: string
		artistName?: string
		onPlayStateChange?: (isPlaying: boolean) => void
	}

	let { previewUrl, albumName = '', artistName = '', onPlayStateChange }: Props = $props()

	let audio: HTMLAudioElement | null = $state(null)
	let isPlaying = $state(false)
	let isLoading = $state(false)
	let currentTime = $state(0)
	let duration = $state(30) // Apple Music previews are 30 seconds
	let volume = $state(1)
	let hasError = $state(false)

	$effect(() => {
		if (audio) {
			audio.volume = volume
		}
	})

	$effect(() => {
		onPlayStateChange?.(isPlaying)
	})

	onMount(() => {
		// Listen for other audio elements playing
		const handleAudioPlay = (e: Event) => {
			const playingAudio = e.target as HTMLAudioElement
			if (playingAudio !== audio && audio && !audio.paused) {
				pause()
			}
		}

		document.addEventListener('play', handleAudioPlay, true)

		return () => {
			document.removeEventListener('play', handleAudioPlay, true)
		}
	})

	onDestroy(() => {
		if (audio) {
			audio.pause()
			audio = null
		}
	})

	function togglePlayPause() {
		if (isPlaying) {
			pause()
		} else {
			play()
		}
	}

	async function play() {
		if (!audio || hasError) return

		isLoading = true
		try {
			await audio.play()
			isPlaying = true
		} catch (error) {
			console.error('Failed to play preview:', error)
			hasError = true
		} finally {
			isLoading = false
		}
	}

	function pause() {
		if (!audio) return
		audio.pause()
		isPlaying = false
	}

	function handleTimeUpdate() {
		if (audio) {
			currentTime = audio.currentTime
		}
	}

	function handleEnded() {
		isPlaying = false
		currentTime = 0
		if (audio) {
			audio.currentTime = 0
		}
	}

	function handleError() {
		hasError = true
		isPlaying = false
		isLoading = false
	}

	function handleLoadedMetadata() {
		if (audio) {
			duration = audio.duration
		}
	}

	function seek(e: MouseEvent) {
		const target = e.currentTarget as HTMLElement
		const rect = target.getBoundingClientRect()
		const x = e.clientX - rect.left
		const percentage = x / rect.width
		const newTime = percentage * duration

		if (audio) {
			audio.currentTime = newTime
			currentTime = newTime
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.code === 'Space') {
			e.preventDefault()
			togglePlayPause()
		}
	}

	function formatTime(time: number): string {
		const minutes = Math.floor(time / 60)
		const seconds = Math.floor(time % 60)
		return `${minutes}:${seconds.toString().padStart(2, '0')}`
	}

	const progressPercentage = $derived((currentTime / duration) * 100)
</script>

<div class="music-preview" role="region" aria-label="Music preview player">
	<audio
		bind:this={audio}
		src={previewUrl}
		onloadedmetadata={handleLoadedMetadata}
		ontimeupdate={handleTimeUpdate}
		onended={handleEnded}
		onerror={handleError}
		preload="metadata"
	/>

	<div class="controls">
		<button
			class="play-button"
			onclick={togglePlayPause}
			onkeydown={handleKeydown}
			disabled={hasError || isLoading}
			aria-label={isPlaying ? 'Pause' : 'Play'}
			aria-pressed={isPlaying}
		>
			{#if isLoading}
				<span class="loading-spinner" aria-hidden="true">⟳</span>
			{:else if hasError}
				<span aria-hidden="true">⚠</span>
			{:else if isPlaying}
				<span aria-hidden="true">❚❚</span>
			{:else}
				<span aria-hidden="true">▶</span>
			{/if}
		</button>

		<div class="progress-container">
			<div
				class="progress-bar"
				onclick={seek}
				role="slider"
				aria-label="Seek"
				aria-valuemin={0}
				aria-valuemax={duration}
				aria-valuenow={currentTime}
				tabindex="0"
			>
				<div class="progress-fill" style="width: {progressPercentage}%"></div>
			</div>
			<div class="time-display">
				<span>{formatTime(currentTime)}</span>
				<span>/</span>
				<span>{formatTime(duration)}</span>
			</div>
		</div>

		<div class="volume-control">
			<label for="volume" class="visually-hidden">Volume</label>
			<input
				id="volume"
				type="range"
				bind:value={volume}
				min="0"
				max="1"
				step="0.1"
				aria-label="Volume control"
			/>
		</div>
	</div>

	{#if hasError}
		<p class="error-message" transition:fade={{ duration: 200 }}>Preview unavailable</p>
	{/if}
</div>

<style lang="scss">
	.music-preview {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
		padding: var(--spacing-sm);
		background: var(--color-surface);
		border-radius: var(--radius-md);
	}

	.controls {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
	}

	.play-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		padding: 0;
		background: var(--color-primary);
		color: var(--color-primary-contrast);
		border: none;
		border-radius: 50%;
		cursor: pointer;
		transition: all 0.2s ease;

		&:hover:not(:disabled) {
			transform: scale(1.05);
			background: var(--color-primary-hover);
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}

		.loading-spinner {
			animation: spin 1s linear infinite;
		}
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.progress-container {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-2xs);
	}

	.progress-bar {
		position: relative;
		height: 6px;
		background: var(--color-surface-secondary);
		border-radius: 3px;
		cursor: pointer;
		overflow: hidden;

		&:hover .progress-fill {
			background: var(--color-primary-hover);
		}
	}

	.progress-fill {
		position: absolute;
		top: 0;
		left: 0;
		height: 100%;
		background: var(--color-primary);
		transition: background 0.2s ease;
	}

	.time-display {
		display: flex;
		gap: var(--spacing-2xs);
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		font-variant-numeric: tabular-nums;
	}

	.volume-control {
		width: 80px;

		input[type='range'] {
			width: 100%;
			height: 6px;
			background: var(--color-surface-secondary);
			border-radius: 3px;
			outline: none;
			-webkit-appearance: none;

			&::-webkit-slider-thumb {
				-webkit-appearance: none;
				width: 14px;
				height: 14px;
				background: var(--color-primary);
				border-radius: 50%;
				cursor: pointer;
			}

			&::-moz-range-thumb {
				width: 14px;
				height: 14px;
				background: var(--color-primary);
				border-radius: 50%;
				cursor: pointer;
				border: none;
			}
		}
	}

	.error-message {
		margin: 0;
		padding: var(--spacing-xs);
		font-size: var(--font-size-sm);
		color: var(--color-error);
		text-align: center;
	}

	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
