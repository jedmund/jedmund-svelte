<script lang="ts">
	import { validateFileType } from '$lib/utils/mediaHelpers'

	interface Props {
		onFilesAdded: (files: File[]) => void
		accept?: string[]
		multiple?: boolean
		compact?: boolean
		disabled?: boolean
		dragActive?: boolean
		class?: string
	}

	let {
		onFilesAdded,
		accept = ['image/*'],
		multiple = true,
		compact = false,
		disabled = false,
		dragActive: externalDragActive = false,
		class: className = ''
	}: Props = $props()

	let fileInput: HTMLInputElement
	let internalDragActive = $state(false)

	// Use external drag state if provided, otherwise use internal
	const dragActive = $derived(externalDragActive || internalDragActive)

	function handleDragOver(event: DragEvent) {
		event.preventDefault()
		if (!disabled) {
			internalDragActive = true
		}
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault()
		internalDragActive = false
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault()
		internalDragActive = false

		if (disabled) return

		const droppedFiles = Array.from(event.dataTransfer?.files || [])
		const validFiles = droppedFiles.filter((file) => validateFileType(file, accept))

		if (validFiles.length !== droppedFiles.length) {
			const invalidCount = droppedFiles.length - validFiles.length
			console.warn(`${invalidCount} file(s) were not accepted due to invalid type`)
		}

		if (validFiles.length > 0) {
			onFilesAdded(multiple ? validFiles : [validFiles[0]])
		}
	}

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement
		const selectedFiles = Array.from(target.files || [])
		const validFiles = selectedFiles.filter((file) => validateFileType(file, accept))

		if (validFiles.length > 0) {
			onFilesAdded(multiple ? validFiles : [validFiles[0]])
		}

		// Clear the input so the same file can be selected again
		target.value = ''
	}

	function openFileBrowser() {
		fileInput.click()
	}

	// Convert accept array to input accept string
	const acceptString = $derived(accept.join(','))
</script>

<div
	class="drop-zone {className}"
	class:active={dragActive}
	class:compact
	class:disabled
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
>
	<div class="drop-zone-content">
		{#if compact}
			<div class="compact-content">
				<svg
					class="add-icon"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<line
						x1="12"
						y1="5"
						x2="12"
						y2="19"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
					/>
					<line
						x1="5"
						y1="12"
						x2="19"
						y2="12"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
					/>
				</svg>
				<span>Add {multiple ? 'files' : 'file'} or drop {multiple ? 'them' : 'it'} here</span>
			</div>
		{:else}
			<div class="upload-icon">
				<svg
					width="48"
					height="48"
					viewBox="0 0 24 24"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
					<polyline
						points="14,2 14,8 20,8"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
					<line
						x1="16"
						y1="13"
						x2="8"
						y2="13"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
					<line
						x1="16"
						y1="17"
						x2="8"
						y2="17"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
					<polyline
						points="10,9 9,9 8,9"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</div>
			<h3>Drop {multiple ? 'files' : 'file'} here</h3>
			<p>or click to browse and select {multiple ? 'files' : 'file'}</p>
			<p class="upload-hint">
				{#if accept.includes('image/*')}
					Supports JPG, PNG, GIF, WebP, and SVG files
				{:else if accept.includes('video/*')}
					Supports MP4, WebM, and other video formats
				{:else}
					Supports selected file types
				{/if}
			</p>
		{/if}
	</div>

	<input
		bind:this={fileInput}
		type="file"
		{multiple}
		accept={acceptString}
		onchange={handleFileSelect}
		class="hidden-input"
		{disabled}
	/>

	<button
		type="button"
		class="drop-zone-button"
		onclick={openFileBrowser}
		{disabled}
		aria-label={dragActive ? 'Drop files' : 'Click to browse'}
	>
		{dragActive ? 'Drop files' : 'Click to browse'}
	</button>
</div>

<style lang="scss">
	.drop-zone {
		border: 2px dashed $gray-80;
		border-radius: $unit-2x;
		padding: $unit-6x $unit-4x;
		text-align: center;
		position: relative;
		background: $gray-95;
		transition: all 0.2s ease;

		&.active {
			border-color: #3b82f6;
			background: rgba(59, 130, 246, 0.05);
		}

		&.compact {
			padding: $unit-3x;
			min-height: auto;

			.drop-zone-content {
				.compact-content {
					display: flex;
					align-items: center;
					justify-content: center;
					gap: $unit-2x;
					color: $gray-40;
					font-size: 0.875rem;

					.add-icon {
						color: $gray-50;
					}
				}
			}
		}

		&:hover:not(.disabled) {
			border-color: $gray-60;
			background: $gray-90;
		}

		&.disabled {
			opacity: 0.6;
			cursor: not-allowed;

			.drop-zone-button {
				cursor: not-allowed;
			}
		}
	}

	.drop-zone-content {
		pointer-events: none;

		.upload-icon {
			color: $gray-50;
			margin-bottom: $unit-2x;
		}

		h3 {
			font-size: 1.25rem;
			color: $gray-20;
			margin: 0 0 $unit 0;
			font-weight: 600;
		}

		p {
			color: $gray-40;
			margin: 0 0 $unit-half 0;
			font-size: 0.875rem;
		}

		.upload-hint {
			font-size: 0.875rem;
			color: $gray-50;
			margin: 0;
		}
	}

	.hidden-input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.drop-zone-button {
		position: absolute;
		inset: 0;
		background: transparent;
		border: none;
		cursor: pointer;
		color: transparent;

		&:disabled {
			cursor: not-allowed;
		}

		&:focus-visible {
			outline: 2px solid $blue-50;
			outline-offset: -2px;
			border-radius: $unit-2x;
		}
	}
</style>
