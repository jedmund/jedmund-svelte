<script lang="ts">
	import type { Media } from '@prisma/client'
	import Button from './Button.svelte'
	import Input from './Input.svelte'
	import SmartImage from '../SmartImage.svelte'
	import MediaLibraryModal from './MediaLibraryModal.svelte'
	import { authenticatedFetch } from '$lib/admin-auth'

	interface Props {
		label: string
		value?: any[] // Changed from Media[] to any[] to be more flexible
		onUpload: (media: any[]) => void
		onReorder?: (media: any[]) => void
		onRemove?: (item: any, index: number) => void // New callback for removals
		maxItems?: number
		allowAltText?: boolean
		required?: boolean
		error?: string
		placeholder?: string
		helpText?: string
		showBrowseLibrary?: boolean
		maxFileSize?: number // MB limit
	}

	let {
		label,
		value = $bindable([]),
		onUpload,
		onReorder,
		onRemove,
		maxItems = 20,
		allowAltText = true,
		required = false,
		error,
		placeholder = 'Drag and drop images here, or click to browse',
		helpText,
		showBrowseLibrary = false,
		maxFileSize = 10
	}: Props = $props()

	// State
	let isUploading = $state(false)
	let uploadProgress = $state<Record<string, number>>({})
	let uploadError = $state<string | null>(null)
	let isDragOver = $state(false)
	let fileInputElement: HTMLInputElement
	let draggedIndex = $state<number | null>(null)
	let draggedOverIndex = $state<number | null>(null)
	let isMediaLibraryOpen = $state(false)

	// Computed properties
	const hasImages = $derived(value && value.length > 0)
	const canAddMore = $derived(!maxItems || !value || value.length < maxItems)
	const remainingSlots = $derived(maxItems ? maxItems - (value?.length || 0) : Infinity)

	// File validation
	function validateFile(file: File): string | null {
		// Check file type
		if (!file.type.startsWith('image/')) {
			return 'Please select image files only'
		}

		// Check file size
		const sizeMB = file.size / 1024 / 1024
		if (sizeMB > maxFileSize) {
			return `File size must be less than ${maxFileSize}MB`
		}

		return null
	}

	// Upload multiple files to server
	async function uploadFiles(files: File[]): Promise<Media[]> {
		const uploadPromises = files.map(async (file, index) => {
			const formData = new FormData()
			formData.append('file', file)

			const response = await authenticatedFetch('/api/media/upload', {
				method: 'POST',
				body: formData
			})

			if (!response.ok) {
				const errorData = await response.json()
				throw new Error(errorData.error || `Upload failed for ${file.name}`)
			}

			return await response.json()
		})

		return Promise.all(uploadPromises)
	}

	// Handle file selection/drop
	async function handleFiles(files: FileList) {
		if (files.length === 0) return

		// Validate files
		const filesToUpload: File[] = []
		const errors: string[] = []

		for (let i = 0; i < files.length; i++) {
			const file = files[i]
			const validationError = validateFile(file)

			if (validationError) {
				errors.push(`${file.name}: ${validationError}`)
			} else if (filesToUpload.length < remainingSlots) {
				filesToUpload.push(file)
			} else {
				errors.push(`${file.name}: Maximum ${maxItems} images allowed`)
			}
		}

		if (errors.length > 0) {
			uploadError = errors.join('\n')
			return
		}

		if (filesToUpload.length === 0) return

		uploadError = null
		isUploading = true

		try {
			// Initialize progress tracking
			const progressKeys = filesToUpload.map((file, index) => `${file.name}-${index}`)
			uploadProgress = Object.fromEntries(progressKeys.map((key) => [key, 0]))

			// Simulate progress for user feedback
			const progressIntervals = progressKeys.map((key) => {
				return setInterval(() => {
					if (uploadProgress[key] < 90) {
						uploadProgress[key] += Math.random() * 10
						uploadProgress = { ...uploadProgress }
					}
				}, 100)
			})

			const uploadedMedia = await uploadFiles(filesToUpload)

			// Clear progress intervals
			progressIntervals.forEach((interval) => clearInterval(interval))

			// Complete progress
			progressKeys.forEach((key) => {
				uploadProgress[key] = 100
			})
			uploadProgress = { ...uploadProgress }

			// Brief delay to show completion
			setTimeout(() => {
				const newValue = [...(value || []), ...uploadedMedia]
				value = newValue
				// Only pass the newly uploaded media, not the entire gallery
				onUpload(uploadedMedia)
				isUploading = false
				uploadProgress = {}
			}, 500)
		} catch (err) {
			isUploading = false
			uploadProgress = {}
			uploadError = err instanceof Error ? err.message : 'Upload failed'
		}
	}

	// Drag and drop handlers for file upload
	function handleDragOver(event: DragEvent) {
		event.preventDefault()
		isDragOver = true
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault()
		isDragOver = false
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault()
		isDragOver = false

		const files = event.dataTransfer?.files
		if (files) {
			handleFiles(files)
		}
	}

	// Click to browse handler
	function handleBrowseClick() {
		fileInputElement?.click()
	}

	function handleFileInputChange(event: Event) {
		const target = event.target as HTMLInputElement
		if (target.files) {
			handleFiles(target.files)
		}
	}

	// Remove individual image - now passes the item to be removed instead of doing it locally
	function handleRemoveImage(index: number) {
		if (!value || !value[index]) return

		const itemToRemove = value[index]
		// Call the onRemove callback if provided, otherwise fall back to onUpload
		if (onRemove) {
			onRemove(itemToRemove, index)
		} else {
			// Fallback: remove locally and call onUpload
			const newValue = value.filter((_, i) => i !== index)
			value = newValue
			onUpload(newValue)
		}
		uploadError = null
	}

	// Update alt text on server
	async function handleAltTextChange(item: any, newAltText: string) {
		if (!item) return

		try {
			// For album photos, use mediaId; for direct media objects, use id
			const mediaId = item.mediaId || item.id
			if (!mediaId) {
				console.error('No media ID found for alt text update')
				return
			}

			const response = await authenticatedFetch(`/api/media/${mediaId}/metadata`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					altText: newAltText.trim() || null
				})
			})

			if (response.ok) {
				const updatedData = await response.json()
				if (value) {
					const index = value.findIndex((v) => (v.mediaId || v.id) === mediaId)
					if (index !== -1) {
						value[index] = {
							...value[index],
							altText: updatedData.altText,
							updatedAt: updatedData.updatedAt
						}
						value = [...value]
					}
				}
			}
		} catch (error) {
			console.error('Failed to update alt text:', error)
		}
	}

	// Drag and drop reordering handlers
	function handleImageDragStart(event: DragEvent, index: number) {
		draggedIndex = index
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move'
		}
	}

	function handleImageDragOver(event: DragEvent, index: number) {
		event.preventDefault()
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move'
		}
		draggedOverIndex = index
	}

	function handleImageDragLeave() {
		draggedOverIndex = null
	}

	function handleImageDrop(event: DragEvent, dropIndex: number) {
		event.preventDefault()

		if (draggedIndex === null || !value) return

		const newValue = [...value]
		const draggedItem = newValue[draggedIndex]

		// Remove from old position
		newValue.splice(draggedIndex, 1)

		// Insert at new position (adjust index if dragging to later position)
		const adjustedDropIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex
		newValue.splice(adjustedDropIndex, 0, draggedItem)

		value = newValue
		onUpload(newValue)
		if (onReorder) {
			onReorder(newValue)
		}

		draggedIndex = null
		draggedOverIndex = null
	}

	function handleImageDragEnd() {
		draggedIndex = null
		draggedOverIndex = null
	}

	// Browse library handler
	function handleBrowseLibrary() {
		isMediaLibraryOpen = true
	}

	function handleMediaSelect(selectedMedia: any | any[]) {
		// For gallery mode, selectedMedia will be an array
		const mediaArray = Array.isArray(selectedMedia) ? selectedMedia : [selectedMedia]

		// Add selected media to existing gallery (avoid duplicates)
		// Check both id and mediaId to handle different object types
		const currentIds = value?.map((m) => m.mediaId || m.id) || []
		const newMedia = mediaArray.filter((media) => !currentIds.includes(media.id))

		if (newMedia.length > 0) {
			const updatedGallery = [...(value || []), ...newMedia]
			value = updatedGallery
			// Only pass the newly selected media, not the entire gallery
			onUpload(newMedia)
		}
	}

	function handleMediaLibraryClose() {
		isMediaLibraryOpen = false
	}
</script>

<div class="gallery-uploader">
	<!-- Upload Area -->
	{#if !hasImages || (hasImages && canAddMore)}
		<div
			class="drop-zone"
			class:drag-over={isDragOver}
			class:uploading={isUploading}
			class:has-error={!!uploadError}
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
			onclick={handleBrowseClick}
		>
			{#if isUploading}
				<!-- Upload Progress -->
				<div class="upload-progress">
					<svg class="upload-spinner" width="24" height="24" viewBox="0 0 24 24">
						<circle
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							stroke-width="2"
							fill="none"
							stroke-dasharray="60"
							stroke-dashoffset="60"
							stroke-linecap="round"
						>
							<animateTransform
								attributeName="transform"
								type="rotate"
								from="0 12 12"
								to="360 12 12"
								dur="1s"
								repeatCount="indefinite"
							/>
						</circle>
					</svg>
					<p class="upload-text">Uploading images...</p>

					<!-- Individual file progress -->
					<div class="file-progress-list">
						{#each Object.entries(uploadProgress) as [fileName, progress]}
							<div class="file-progress-item">
								<span class="file-name">{fileName.split('-')[0]}</span>
								<div class="progress-bar">
									<div class="progress-fill" style="width: {Math.round(progress)}%"></div>
								</div>
								<span class="progress-percent">{Math.round(progress)}%</span>
							</div>
						{/each}
					</div>
				</div>
			{:else}
				<!-- Upload Prompt -->
				<div class="upload-prompt">
					<svg
						class="upload-icon"
						width="48"
						height="48"
						viewBox="0 0 24 24"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M14 2H6A2 2 0 0 0 4 4V20A2 2 0 0 0 6 22H18A2 2 0 0 0 20 20V8L14 2Z"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
						<polyline
							points="14,2 14,8 20,8"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
						<line
							x1="16"
							y1="13"
							x2="8"
							y2="13"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
						/>
						<line
							x1="16"
							y1="17"
							x2="8"
							y2="17"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
						/>
						<polyline
							points="10,9 9,9 8,9"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
					<p class="upload-main-text">{placeholder}</p>
					<p class="upload-sub-text">
						Supports JPG, PNG, GIF up to {maxFileSize}MB
						{#if maxItems}
							• Maximum {maxItems} images
						{/if}
						{#if hasImages && remainingSlots < Infinity}
							• {remainingSlots} slots remaining
						{/if}
					</p>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Action Buttons -->
	{#if !isUploading && canAddMore}
		<div class="action-buttons">
			<Button variant="primary" onclick={handleBrowseClick}>
				{hasImages ? 'Add More Images' : 'Choose Images'}
			</Button>

			{#if showBrowseLibrary}
				<Button variant="ghost" onclick={handleBrowseLibrary}>Browse Library</Button>
			{/if}
		</div>
	{/if}

	<!-- Image Gallery -->
	{#if hasImages}
		<div class="image-gallery">
			{#each value as media, index (media.id)}
				<div
					class="gallery-item"
					class:dragging={draggedIndex === index}
					class:drag-over={draggedOverIndex === index}
					draggable="true"
					ondragstart={(e) => handleImageDragStart(e, index)}
					ondragover={(e) => handleImageDragOver(e, index)}
					ondragleave={handleImageDragLeave}
					ondrop={(e) => handleImageDrop(e, index)}
					ondragend={handleImageDragEnd}
				>
					<!-- Drag Handle -->
					<div class="drag-handle">
						<svg
							width="12"
							height="12"
							viewBox="0 0 24 24"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<circle cx="9" cy="6" r="2" fill="currentColor" />
							<circle cx="15" cy="6" r="2" fill="currentColor" />
							<circle cx="9" cy="12" r="2" fill="currentColor" />
							<circle cx="15" cy="12" r="2" fill="currentColor" />
							<circle cx="9" cy="18" r="2" fill="currentColor" />
							<circle cx="15" cy="18" r="2" fill="currentColor" />
						</svg>
					</div>

					<!-- Image Preview -->
					<div class="image-preview">
						<SmartImage
							media={{
								id: media.mediaId || media.id,
								filename: media.filename,
								originalName: media.originalName || media.filename,
								mimeType: media.mimeType || 'image/jpeg',
								size: media.size || 0,
								url: media.url,
								thumbnailUrl: media.thumbnailUrl,
								width: media.width,
								height: media.height,
								altText: media.altText,
								description: media.description,
								isPhotography: media.isPhotography || false,
								createdAt: media.createdAt,
								updatedAt: media.updatedAt
							}}
							alt={media.altText || media.filename || 'Gallery image'}
							containerWidth={300}
							loading="lazy"
							aspectRatio="1:1"
							class="gallery-image"
						/>

						<!-- Remove Button -->
						<button
							class="remove-button"
							onclick={() => handleRemoveImage(index)}
							type="button"
							aria-label="Remove image"
						>
							<svg
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<line
									x1="18"
									y1="6"
									x2="6"
									y2="18"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
								<line
									x1="6"
									y1="6"
									x2="18"
									y2="18"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
						</button>
					</div>

					<!-- Alt Text Input -->
					{#if allowAltText}
						<div class="alt-text-input">
							<Input
								type="text"
								label="Alt Text"
								value={media.altText || ''}
								placeholder="Describe this image"
								buttonSize="small"
								onblur={(e) => handleAltTextChange(media, e.target.value)}
							/>
						</div>
					{/if}

					<!-- File Info -->
					<div class="file-info">
						<p class="filename">{media.originalName || media.filename}</p>
						<p class="file-meta">
							{Math.round((media.size || 0) / 1024)} KB
							{#if media.width && media.height}
								• {media.width}×{media.height}
							{/if}
						</p>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Error Message -->
	{#if error || uploadError}
		<p class="error-message">{error || uploadError}</p>
	{/if}

	<!-- Hidden File Input -->
	<input
		bind:this={fileInputElement}
		type="file"
		accept="image/*"
		multiple
		style="display: none;"
		onchange={handleFileInputChange}
	/>
</div>

<!-- Media Library Modal -->
<MediaLibraryModal
	bind:isOpen={isMediaLibraryOpen}
	mode="multiple"
	fileType="image"
	title="Select Images"
	confirmText="Add Selected"
	onSelect={handleMediaSelect}
	onClose={handleMediaLibraryClose}
/>

<style lang="scss">
	.gallery-uploader {
		display: flex;
		flex-direction: column;
		gap: $unit-2x;
	}

	.uploader-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: $grey-20;

		.required {
			color: $red-60;
			margin-left: $unit-half;
		}
	}

	.help-text {
		margin: 0;
		font-size: 0.8rem;
		color: $grey-40;
		line-height: 1.4;
	}

	// Drop Zone Styles
	.drop-zone {
		border: 2px dashed $grey-80;
		border-radius: $card-corner-radius;
		background-color: $grey-97;
		cursor: pointer;
		transition: all 0.2s ease;
		min-height: 120px;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		overflow: hidden;

		&:hover {
			border-color: $blue-60;
			background-color: rgba($blue-60, 0.02);
		}

		&.drag-over {
			border-color: $blue-60;
			background-color: rgba($blue-60, 0.05);
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
	}

	.upload-prompt {
		text-align: center;
		padding: $unit-3x;

		.upload-icon {
			color: $grey-50;
			margin-bottom: $unit-2x;
		}

		.upload-main-text {
			margin: 0 0 $unit 0;
			font-size: 0.875rem;
			color: $grey-30;
			font-weight: 500;
		}

		.upload-sub-text {
			margin: 0;
			font-size: 0.75rem;
			color: $grey-50;
		}
	}

	.upload-progress {
		text-align: center;
		padding: $unit-3x;

		.upload-spinner {
			color: $blue-60;
			margin-bottom: $unit-2x;
		}

		.upload-text {
			margin: 0 0 $unit-2x 0;
			font-size: 0.875rem;
			color: $grey-30;
			font-weight: 500;
		}

		.file-progress-list {
			display: flex;
			flex-direction: column;
			gap: $unit;
			max-width: 300px;
			margin: 0 auto;
		}

		.file-progress-item {
			display: flex;
			align-items: center;
			gap: $unit;
			font-size: 0.75rem;

			.file-name {
				flex: 1;
				color: $grey-30;
				text-align: left;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}

			.progress-bar {
				width: 60px;
				height: 4px;
				background-color: $grey-90;
				border-radius: 2px;
				overflow: hidden;

				.progress-fill {
					height: 100%;
					background-color: $blue-60;
					transition: width 0.3s ease;
				}
			}

			.progress-percent {
				width: 30px;
				text-align: right;
				color: $grey-40;
				font-size: 0.7rem;
			}
		}
	}

	.action-buttons {
		display: flex;
		gap: $unit-2x;
		align-items: center;
	}

	// Image Gallery Styles
	.image-gallery {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: $unit-3x;
		margin-top: $unit-2x;
	}

	.gallery-item {
		position: relative;
		border: 1px solid $grey-90;
		border-radius: $card-corner-radius;
		background-color: white;
		overflow: hidden;
		transition: all 0.2s ease;

		&:hover {
			border-color: $grey-70;
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
		}

		&.dragging {
			opacity: 0.5;
			transform: scale(0.95);
		}

		&.drag-over {
			border-color: $blue-60;
			background-color: rgba($blue-60, 0.05);
		}

		.drag-handle {
			position: absolute;
			top: $unit;
			left: $unit;
			z-index: 2;
			background: rgba(255, 255, 255, 0.9);
			border-radius: 4px;
			padding: $unit-half;
			cursor: grab;
			color: $grey-40;
			opacity: 0;
			transition: opacity 0.2s ease;

			&:active {
				cursor: grabbing;
			}
		}

		&:hover .drag-handle {
			opacity: 1;
		}
	}

	.image-preview {
		position: relative;
		aspect-ratio: 1;
		overflow: hidden;

		:global(.gallery-image) {
			width: 100%;
			height: 100%;
			object-fit: cover;
			display: block;
		}

		.remove-button {
			position: absolute;
			top: $unit;
			right: $unit;
			background: rgba(255, 255, 255, 0.9);
			border: none;
			border-radius: 50%;
			width: 28px;
			height: 28px;
			display: flex;
			align-items: center;
			justify-content: center;
			cursor: pointer;
			color: $grey-40;
			opacity: 0;
			transition: all 0.2s ease;

			&:hover {
				background: white;
				color: $red-60;
				box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
			}
		}

		&:hover .remove-button {
			opacity: 1;
		}
	}

	.alt-text-input {
		padding: $unit-2x;
	}

	.file-info {
		padding: $unit-2x;
		padding-top: $unit;
		border-top: 1px solid $grey-95;

		.filename {
			margin: 0 0 $unit-half 0;
			font-size: 0.75rem;
			font-weight: 500;
			color: $grey-10;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.file-meta {
			margin: 0;
			font-size: 0.7rem;
			color: $grey-40;
		}
	}

	.error-message {
		margin: 0;
		font-size: 0.75rem;
		color: $red-60;
		padding: $unit;
		background-color: rgba($red-60, 0.05);
		border-radius: $card-corner-radius;
		border: 1px solid rgba($red-60, 0.2);
		white-space: pre-line;
	}

	// Responsive adjustments
	@media (max-width: 640px) {
		.image-gallery {
			grid-template-columns: 1fr;
		}

		.upload-prompt {
			padding: $unit-2x;

			.upload-main-text {
				font-size: 0.8rem;
			}
		}

		.action-buttons {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
