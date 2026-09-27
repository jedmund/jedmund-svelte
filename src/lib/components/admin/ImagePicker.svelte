<script lang="ts">
	import Button from './Button.svelte'
	import ImagePickerMetadata from './media/ImagePickerMetadata.svelte'
	import ImagePickerActions from './media/ImagePickerActions.svelte'
	import UnifiedMediaModal from './UnifiedMediaModal.svelte'
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

	function handleImageSelect(media: Media | Media[]) {
		value = Array.isArray(media) ? media[0] : media
		showModal = false
	}

	function handleClear() {
		value = null
	}

	function openModal() {
		showModal = true
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
					return width && height ? `aspect-ratio: ${width}/${height};` : 'aspect-ratio: 16/9;'
				})()
	)
</script>

<div class="image-picker">
	<div class="input-label">
		{label}
		{#if required}
			<span class="required">*</span>
		{/if}
	</div>

	<!-- Image Preview Area -->
	<div
		class="image-preview-container"
		class:has-image={hasImage}
		class:has-error={error}
		style={aspectRatioStyle}
		role="button"
		tabindex="0"
		onclick={openModal}
		onkeydown={(e) => {
			if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
				e.preventDefault()
				openModal()
			}
		}}
		onfocusin={() => (isHovering = true)}
		onfocusout={(e) => {
			if (!e.currentTarget.contains(e.relatedTarget as Node | null)) isHovering = false
		}}
		onmouseenter={() => (isHovering = true)}
		onmouseleave={() => (isHovering = false)}
	>
		{#if hasImage && value}
			<!-- Image Display -->
			<img src={value.url} alt={value.filename} class="preview-image" />

			<!-- Hover Overlay -->
			{#if isHovering}
				<ImagePickerActions onChange={openModal} onClear={handleClear} />
			{/if}
		{:else}
			<!-- Empty State -->
			<div class="empty-state">
				<div class="empty-icon">
					<svg
						width="48"
						height="48"
						viewBox="0 0 24 24"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<rect
							x="3"
							y="5"
							width="18"
							height="14"
							rx="2"
							stroke="currentColor"
							stroke-width="1.5"
						/>
						<circle cx="8.5" cy="8.5" r=".5" fill="currentColor" />
						<path d="M3 16l5-5 3 3 4-4 4 4" stroke="currentColor" stroke-width="1.5" fill="none" />
					</svg>
				</div>
				<p class="empty-text">{placeholder}</p>
				<Button variant="ghost" onclick={openModal}>
					{#snippet icon()}<svg
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
						</svg>{/snippet}
					Select Image
				</Button>
			</div>
		{/if}
	</div>

	<!-- Image Details -->
	{#if hasImage && value}
		<ImagePickerMetadata media={value} {showDimensions} />
	{/if}

	<!-- Error Message -->
	{#if error}
		<p class="error-message">{error}</p>
	{/if}

	<!-- Media Library Modal -->
	<UnifiedMediaModal
		bind:isOpen={showModal}
		mode="single"
		fileType="image"
		{selectedIds}
		title="Select Image"
		confirmText="Select Image"
		onSelect={handleImageSelect}
		onClose={() => (showModal = false)}
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
		color: $gray-20;

		.required {
			color: $red-60;
			margin-left: $unit-half;
		}
	}

	.image-preview-container {
		position: relative;
		width: 100%;
		border: 2px dashed $gray-80;
		border-radius: $card-corner-radius;
		overflow: hidden;
		cursor: pointer;
		transition: all 0.2s ease;
		background-color: $gray-95;

		&:hover {
			border-color: $gray-60;
		}

		&:focus {
			outline: none;
			border-color: $blue-60;
			box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
		}

		&.has-image {
			border-style: solid;
			border-color: $gray-80;
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
		color: $gray-60;
		margin-bottom: $unit;
	}

	.empty-text {
		margin: 0;
		font-size: 0.875rem;
		color: $gray-40;
		margin-bottom: $unit;
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
	}
</style>
