<script lang="ts">
	import Button from './Button.svelte'
	import MediaLibraryModal from './MediaLibraryModal.svelte'
	import type { Media } from '@prisma/client'

	interface Props {
		label: string
		value?: Media[]
		maxItems?: number
		required?: boolean
		error?: string
		showFileInfo?: boolean
	}

	let {
		label,
		value = $bindable([]),
		maxItems,
		required = false,
		error,
		showFileInfo = false
	}: Props = $props()

	let showModal = $state(false)
	let draggedIndex = $state<number | null>(null)
	let dragOverIndex = $state<number | null>(null)

	function handleImagesSelect(media: Media[]) {
		// Add new images to existing ones, avoiding duplicates
		const existingIds = new Set(value.map(item => item.id))
		const newImages = media.filter(item => !existingIds.has(item.id))
		
		if (maxItems) {
			const availableSlots = maxItems - value.length
			value = [...value, ...newImages.slice(0, availableSlots)]
		} else {
			value = [...value, ...newImages]
		}
		
		showModal = false
	}

	function removeImage(index: number) {
		value = value.filter((_, i) => i !== index)
	}

	function openModal() {
		showModal = true
	}

	// Drag and Drop functionality
	function handleDragStart(event: DragEvent, index: number) {
		if (!event.dataTransfer) return
		
		draggedIndex = index
		event.dataTransfer.effectAllowed = 'move'
		event.dataTransfer.setData('text/html', '')
		
		// Add dragging class to the dragged element
		const target = event.target as HTMLElement
		target.style.opacity = '0.5'
	}

	function handleDragEnd(event: DragEvent) {
		const target = event.target as HTMLElement
		target.style.opacity = '1'
		
		draggedIndex = null
		dragOverIndex = null
	}

	function handleDragOver(event: DragEvent, index: number) {
		event.preventDefault()
		if (!event.dataTransfer) return
		
		event.dataTransfer.dropEffect = 'move'
		dragOverIndex = index
	}

	function handleDragLeave() {
		dragOverIndex = null
	}

	function handleDrop(event: DragEvent, dropIndex: number) {
		event.preventDefault()
		
		if (draggedIndex === null || draggedIndex === dropIndex) {
			return
		}

		// Reorder the array
		const newValue = [...value]
		const draggedItem = newValue[draggedIndex]
		
		// Remove the dragged item
		newValue.splice(draggedIndex, 1)
		
		// Insert at the new position (adjust index if necessary)
		const insertIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex
		newValue.splice(insertIndex, 0, draggedItem)
		
		value = newValue
		
		// Reset drag state
		draggedIndex = null
		dragOverIndex = null
	}

	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 B'
		const k = 1024
		const sizes = ['B', 'KB', 'MB', 'GB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
	}

	// Computed properties
	const hasImages = $derived(value.length > 0)
	const canAddMore = $derived(!maxItems || value.length < maxItems)
	const selectedIds = $derived(value.map(item => item.id))
	const itemsText = $derived(
		value.length === 1 ? '1 image' : `${value.length} images`
	)
</script>

<div class="gallery-manager">
	<div class="header">
		<label class="input-label">
			{label}
			{#if required}
				<span class="required">*</span>
			{/if}
		</label>
		
		{#if hasImages}
			<span class="items-count">
				{itemsText}
				{#if maxItems}
					of {maxItems} max
				{/if}
			</span>
		{/if}
	</div>

	<!-- Gallery Grid -->
	{#if hasImages}
		<div class="gallery-grid" class:has-error={error}>
			{#each value as item, index (item.id)}
				<div 
					class="gallery-item"
					class:drag-over={dragOverIndex === index}
					draggable="true"
					ondragstart={(e) => handleDragStart(e, index)}
					ondragend={handleDragEnd}
					ondragover={(e) => handleDragOver(e, index)}
					ondragleave={handleDragLeave}
					ondrop={(e) => handleDrop(e, index)}
				>
					<!-- Drag Handle -->
					<div class="drag-handle">
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<circle cx="9" cy="12" r="1" fill="currentColor"/>
							<circle cx="9" cy="5" r="1" fill="currentColor"/>
							<circle cx="9" cy="19" r="1" fill="currentColor"/>
							<circle cx="15" cy="12" r="1" fill="currentColor"/>
							<circle cx="15" cy="5" r="1" fill="currentColor"/>
							<circle cx="15" cy="19" r="1" fill="currentColor"/>
						</svg>
					</div>

					<!-- Image -->
					<div class="image-container">
						{#if item.thumbnailUrl}
							<img src={item.thumbnailUrl} alt={item.filename} />
						{:else}
							<div class="image-placeholder">
								<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
									<rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="2"/>
									<circle cx="8.5" cy="8.5" r=".5" fill="currentColor"/>
									<path d="M3 16l5-5 3 3 4-4 4 4" stroke="currentColor" stroke-width="2" fill="none"/>
								</svg>
							</div>
						{/if}
					</div>

					<!-- Image Info -->
					{#if showFileInfo}
						<div class="image-info">
							<p class="filename">{item.filename}</p>
							<p class="file-size">{formatFileSize(item.size)}</p>
						</div>
					{/if}

					<!-- Remove Button -->
					<button 
						type="button"
						class="remove-button"
						onclick={() => removeImage(index)}
						aria-label="Remove image"
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path
								d="M6 6L18 18M6 18L18 6"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
							/>
						</svg>
					</button>

					<!-- Order Indicator -->
					<div class="order-indicator">
						{index + 1}
					</div>
				</div>
			{/each}

			<!-- Add More Button (if within grid) -->
			{#if canAddMore}
				<button 
					type="button"
					class="add-more-item"
					onclick={openModal}
				>
					<div class="add-icon">
						<svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path
								d="M12 5v14m-7-7h14"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
							/>
						</svg>
					</div>
					<span>Add Images</span>
				</button>
			{/if}
		</div>
	{:else}
		<!-- Empty State -->
		<div class="empty-state" class:has-error={error}>
			<div class="empty-content">
				<div class="empty-icon">
					<svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/>
						<circle cx="8.5" cy="8.5" r=".5" fill="currentColor"/>
						<path d="M3 16l5-5 3 3 4-4 4 4" stroke="currentColor" stroke-width="1.5" fill="none"/>
					</svg>
				</div>
				<p class="empty-text">No images added yet</p>
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
							d="M12 5v14m-7-7h14"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
						/>
					</svg>
					Add Images
				</Button>
			</div>
		</div>
	{/if}

	<!-- Add More Button (outside grid) -->
	{#if hasImages && canAddMore}
		<div class="add-more-container">
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
				Add More Images
			</Button>
		</div>
	{/if}

	<!-- Error Message -->
	{#if error}
		<p class="error-message">{error}</p>
	{/if}

	<!-- Help Text -->
	{#if hasImages}
		<p class="help-text">Drag and drop to reorder images</p>
	{/if}

	<!-- Media Library Modal -->
	<MediaLibraryModal
		bind:isOpen={showModal}
		mode="multiple"
		fileType="image"
		{selectedIds}
		title="Add Images to Gallery"
		confirmText="Add Selected Images"
		onselect={handleImagesSelect}
	/>
</div>

<style lang="scss">
	.gallery-manager {
		display: flex;
		flex-direction: column;
		gap: $unit;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: $unit-2x;
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

	.items-count {
		font-size: 0.75rem;
		color: $grey-40;
		font-weight: 500;
	}

	.gallery-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: $unit-2x;
		padding: $unit-2x;
		border: 1px solid $grey-85;
		border-radius: $card-corner-radius;
		background-color: $grey-97;

		&.has-error {
			border-color: $red-60;
		}
	}

	.gallery-item {
		position: relative;
		aspect-ratio: 1;
		border-radius: $card-corner-radius;
		overflow: hidden;
		cursor: move;
		transition: all 0.2s ease;
		background-color: white;
		border: 1px solid $grey-90;

		&:hover {
			transform: translateY(-2px);
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

			.remove-button {
				opacity: 1;
			}
		}

		&.drag-over {
			border-color: $blue-60;
			background-color: rgba(59, 130, 246, 0.05);
		}
	}

	.drag-handle {
		position: absolute;
		top: $unit-half;
		left: $unit-half;
		z-index: 3;
		background-color: rgba(0, 0, 0, 0.6);
		color: white;
		padding: $unit-half;
		border-radius: 4px;
		opacity: 0;
		transition: opacity 0.2s ease;
		pointer-events: none;

		.gallery-item:hover & {
			opacity: 1;
		}
	}

	.image-container {
		width: 100%;
		height: 100%;
		position: relative;

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}
	}

	.image-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		background-color: $grey-95;
		color: $grey-60;
	}

	.image-info {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
		padding: $unit-2x $unit $unit;
		color: white;

		.filename {
			margin: 0 0 $unit-fourth 0;
			font-size: 0.75rem;
			font-weight: 500;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		.file-size {
			margin: 0;
			font-size: 0.625rem;
			opacity: 0.8;
		}
	}

	.remove-button {
		position: absolute;
		top: $unit-half;
		right: $unit-half;
		z-index: 3;
		background-color: rgba(239, 68, 68, 0.9);
		color: white;
		border: none;
		border-radius: 50%;
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		opacity: 0;
		transition: all 0.2s ease;

		&:hover {
			background-color: $red-60;
			transform: scale(1.1);
		}
	}

	.order-indicator {
		position: absolute;
		top: $unit-half;
		right: $unit-half;
		z-index: 2;
		background-color: rgba(0, 0, 0, 0.7);
		color: white;
		font-size: 0.75rem;
		font-weight: 600;
		padding: $unit-fourth $unit-half;
		border-radius: 12px;
		min-width: 20px;
		text-align: center;
		line-height: 1;
	}

	.add-more-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: $unit;
		aspect-ratio: 1;
		border: 2px dashed $grey-70;
		border-radius: $card-corner-radius;
		background-color: transparent;
		color: $grey-50;
		cursor: pointer;
		transition: all 0.2s ease;
		font-size: 0.875rem;
		font-weight: 500;

		&:hover {
			border-color: $blue-60;
			color: $blue-60;
			background-color: rgba(59, 130, 246, 0.05);
		}
	}

	.add-icon {
		color: inherit;
	}

	.empty-state {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 200px;
		border: 2px dashed $grey-80;
		border-radius: $card-corner-radius;
		background-color: $grey-97;

		&.has-error {
			border-color: $red-60;
		}
	}

	.empty-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: $unit-2x;
		text-align: center;
		padding: $unit-4x;
	}

	.empty-icon {
		color: $grey-60;
	}

	.empty-text {
		margin: 0;
		font-size: 0.875rem;
		color: $grey-40;
	}

	.add-more-container {
		display: flex;
		justify-content: center;
		padding-top: $unit;
	}

	.error-message {
		margin: 0;
		font-size: 0.75rem;
		color: $red-60;
	}

	.help-text {
		margin: 0;
		font-size: 0.75rem;
		color: $grey-50;
		text-align: center;
		font-style: italic;
	}

	// Responsive adjustments
	@media (max-width: 640px) {
		.gallery-grid {
			grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
			gap: $unit;
			padding: $unit;
		}

		.header {
			flex-direction: column;
			align-items: flex-start;
			gap: $unit;
		}

		.order-indicator {
			font-size: 0.625rem;
			padding: $unit-fourth $unit-half;
		}

		.remove-button {
			opacity: 1; // Always visible on mobile
		}

		.image-info {
			display: none; // Hide on mobile to save space
		}
	}
</style>