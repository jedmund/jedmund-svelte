<script lang="ts">
	import { FileImage, LoaderCircle } from '@lucide/svelte'
	interface Props {
		label: string
		placeholder: string
		maxFileSize: number
		aspectRatio?: string
		busy: boolean
		progress: number
		hasError: boolean
		onBrowse: () => void
		onFile: (file: File) => void
	}
	let {
		label,
		placeholder,
		maxFileSize,
		aspectRatio,
		busy,
		progress,
		hasError,
		onBrowse,
		onFile
	}: Props = $props()
	let dragOver = $state(false)
	const ratio = $derived(aspectRatio?.replace(':', '/') || undefined)

	function drop(event: DragEvent) {
		event.preventDefault()
		dragOver = false
		const file = event.dataTransfer?.files[0]
		if (!busy && file) onFile(file)
	}
</script>

<button
	type="button"
	class="drop-zone"
	class:drag-over={dragOver && !busy}
	class:uploading={busy}
	class:has-error={hasError}
	style:aspect-ratio={ratio}
	disabled={busy}
	aria-label={`Upload ${label || 'image'}`}
	ondragover={(event) => {
		event.preventDefault()
		dragOver = !busy
	}}
	ondragleave={(event) => {
		event.preventDefault()
		dragOver = false
	}}
	ondrop={drop}
	onclick={onBrowse}
>
	{#if busy}
		<span class="upload-progress" role="status">
			<LoaderCircle class="upload-spinner" size={24} />
			<span class="upload-text">{progress === 100 ? 'Upload complete' : 'Uploading...'}</span>
			<span class="progress-bar" aria-hidden="true">
				<span class="progress-fill" style:width={`${progress}%`}></span>
			</span>
		</span>
	{:else}
		<span class="upload-prompt">
			<FileImage class="upload-icon" size={48} />
			<span class="upload-main-text">{placeholder}</span>
			<span class="upload-sub-text"
				>Supports JPG, PNG, GIF, WebP, and SVG up to {maxFileSize}MB</span
			>
		</span>
	{/if}
</button>

<style lang="scss">
	.drop-zone {
		width: 100%;
		font: inherit;
		border: 2px dashed $gray-80;
		border-radius: $card-corner-radius;
		background-color: $gray-97;
		cursor: pointer;
		transition: all 0.2s ease;
		min-height: 200px;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		overflow: hidden;
		&:hover:not(:disabled),
		&.drag-over {
			border-color: $blue-60;
			background-color: rgba($blue-60, 0.05);
		}
		&.drag-over {
			border-style: solid;
		}
		&.uploading {
			cursor: default;
			border-color: $blue-60;
		}
		&.has-error {
			border-color: $red-60;
			background-color: rgba($red-60, 0.02);
		}
		&:focus-visible {
			outline: 2px solid $blue-60;
			outline-offset: 2px;
		}
	}
	.upload-prompt,
	.upload-progress {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: $unit-4x;
		:global(.upload-icon) {
			color: $gray-50;
			margin-bottom: $unit-2x;
		}
		:global(.upload-spinner) {
			color: $blue-60;
			margin-bottom: $unit-2x;
			animation: spin 1s linear infinite;
		}
	}
	.upload-main-text {
		margin-bottom: $unit;
		font-size: 0.875rem;
		color: $gray-30;
		font-weight: 500;
	}
	.upload-sub-text {
		font-size: 0.75rem;
		color: $gray-50;
	}
	.upload-text {
		margin-bottom: $unit-2x;
		font-size: 0.875rem;
		color: $gray-30;
	}
	.progress-bar {
		width: 200px;
		height: 4px;
		background-color: $gray-90;
		border-radius: 2px;
		overflow: hidden;
	}
	.progress-fill {
		display: block;
		height: 100%;
		background-color: $blue-60;
		transition: width 0.3s ease;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.upload-progress :global(.upload-spinner) {
			animation: none;
		}
		.progress-fill {
			transition: none;
		}
	}
	@media (max-width: 640px) {
		.upload-prompt {
			padding: $unit-3x;
		}
		.upload-main-text {
			font-size: 0.8rem;
		}
	}
</style>
