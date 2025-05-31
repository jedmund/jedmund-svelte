<script lang="ts">
	import Button from './Button.svelte'
	import MediaLibraryModal from './MediaLibraryModal.svelte'
	import type { Media } from '@prisma/client'

	interface Props {
		label: string
		value?: Media | null
		aspectRatio?: string
		placeholder?: string
		required?: boolean
		error?: string
		showDimensions?: boolean
	}

	let {
		label,
		value = $bindable(),
		aspectRatio,
		placeholder = 'No image selected',
		required = false,
		error,
		showDimensions = true
	}: Props = $props()

	let showModal = $state(false)
	let isHovering = $state(false)

	function handleImageSelect(media: Media) {
		value = media
		showModal = false
	}

	function handleClear() {
		value = null
	}

	function openModal() {
		showModal = true
	}

	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 B'
		const k = 1024
		const sizes = ['B', 'KB', 'MB', 'GB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
	}

	// Computed properties
	const hasImage = $derived(value !== null && value !== undefined)
	const selectedIds = $derived(hasImage ? [value!.id] : [])

	// Calculate aspect ratio styles
	const aspectRatioStyle = $derived(
		!aspectRatio 
			? 'aspect-ratio: 16/9;'
			: (() => {
				const [width, height] = aspectRatio.split(':').map(Number)
				return width && height 
					? `aspect-ratio: ${width}/${height};`
					: 'aspect-ratio: 16/9;'
			})()
	)
</script>

<div class="image-picker">
	<label class="input-label">
		{label}
		{#if required}
			<span class="required">*</span>
		{/if}
	</label>

	<!-- Image Preview Area -->
	<div 
		class="image-preview-container"
		class:has-image={hasImage}
		class:has-error={error}
		style={aspectRatioStyle}
		role="button"
		tabindex="0"
		onclick={openModal}
		onkeydown={(e) => e.key === 'Enter' && openModal()}
		onmouseenter={() => isHovering = true}
		onmouseleave={() => isHovering = false}
	>
		{#if hasImage && value}
			<!-- Image Display -->
			<img 
				src={value.url} 
				alt={value.filename}
				class="preview-image"
			/>
			
			<!-- Hover Overlay -->
			{#if isHovering}
				<div class="image-overlay">
					<div class="overlay-actions">
						<Button variant="primary" onclick={openModal}>
							<svg
								slot="icon"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
								<path
									d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
							Change
						</Button>
						<Button variant="ghost" onclick={handleClear}>
							<svg
								slot="icon"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
							Remove
						</Button>
					</div>
				</div>
			{/if}
		{:else}
			<!-- Empty State -->
			<div class="empty-state">
				<div class="empty-icon">
					<svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/>
						<circle cx="8.5" cy="8.5" r=".5" fill="currentColor"/>
						<path d="M3 16l5-5 3 3 4-4 4 4" stroke="currentColor" stroke-width="1.5" fill="none"/>
					</svg>
				</div>
				<p class="empty-text">{placeholder}</p>
				<Button variant="ghost" onclick={openModal}>
					<svg
						slot="icon"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M12 5v14m-7-7h14"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
						/>
					</svg>
					Select Image
				</Button>
			</div>
		{/if}
	</div>

	<!-- Image Details -->
	{#if hasImage && value}
		<div class="image-details">
			<div class="detail-row">
				<span class="detail-label">Filename:</span>
				<span class="detail-value">{value.filename}</span>
			</div>
			<div class="detail-row">
				<span class="detail-label">Size:</span>
				<span class="detail-value">{formatFileSize(value.size)}</span>
			</div>
			{#if showDimensions && value.width && value.height}
				<div class="detail-row">
					<span class="detail-label">Dimensions:</span>
					<span class="detail-value">{value.width} × {value.height} px</span>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Error Message -->
	{#if error}
		<p class="error-message">{error}</p>
	{/if}

	<!-- Media Library Modal -->
	<MediaLibraryModal
		bind:isOpen={showModal}
		mode="single"
		fileType="image"
		{selectedIds}
		title="Select Image"
		confirmText="Select Image"
		onselect={handleImageSelect}
	/>
</div>

<style lang="scss">
	.image-picker {
		display: flex;
		flex-direction: column;
		gap: $unit;
	}

	.input-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: $grey-20;

		.required {
			color: $red-60;
			margin-left: $unit-half;
		}
	}

	.image-preview-container {
		position: relative;
		width: 100%;
		border: 2px dashed $grey-80;
		border-radius: $card-corner-radius;
		overflow: hidden;
		cursor: pointer;
		transition: all 0.2s ease;
		background-color: $grey-95;

		&:hover {
			border-color: $grey-60;
		}

		&:focus {
			outline: none;
			border-color: $blue-60;
			box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
		}

		&.has-image {
			border-style: solid;
			border-color: $grey-80;
			background-color: transparent;

			&:hover {
				border-color: $blue-60;
			}
		}

		&.has-error {
			border-color: $red-60;

			&:focus {
				border-color: $red-60;
				box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
			}
		}
	}

	.preview-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.image-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		transition: opacity 0.2s ease;
		animation: fadeIn 0.2s ease forwards;
	}

	@keyframes fadeIn {
		to {
			opacity: 1;
		}
	}

	.overlay-actions {
		display: flex;
		gap: $unit-2x;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: $unit-4x;
		text-align: center;
		height: 100%;
		min-height: 200px;
		gap: $unit-2x;
	}

	.empty-icon {
		color: $grey-60;
		margin-bottom: $unit;
	}

	.empty-text {
		margin: 0;
		font-size: 0.875rem;
		color: $grey-40;
		margin-bottom: $unit;
	}

	.image-details {
		padding: $unit-2x;
		background-color: $grey-95;
		border-radius: $card-corner-radius;
		display: flex;
		flex-direction: column;
		gap: $unit-half;
	}

	.detail-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.875rem;
	}

	.detail-label {
		font-weight: 500;
		color: $grey-30;
	}

	.detail-value {
		color: $grey-10;
		text-align: right;
		word-break: break-all;
	}

	.error-message {
		margin: 0;
		font-size: 0.75rem;
		color: $red-60;
	}

	// Responsive adjustments
	@media (max-width: 640px) {
		.empty-state {
			padding: $unit-3x;
			min-height: 150px;
		}

		.empty-icon svg {
			width: 32px;
			height: 32px;
		}

		.overlay-actions {
			flex-direction: column;
			gap: $unit;
		}

		.detail-row {
			flex-direction: column;
			align-items: flex-start;
			gap: $unit-half;
		}

		.detail-value {
			text-align: left;
		}
	}
</style>