<script lang="ts">
	import type { Media } from '@prisma/client'
	import Button from './Button.svelte'
	import Input from './Input.svelte'
	import SmartImage from '../SmartImage.svelte'
	import MediaLibraryModal from './MediaLibraryModal.svelte'
	import MediaDetailsModal from './MediaDetailsModal.svelte'
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
		disabled?: boolean
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
		maxFileSize = 10,
		disabled = false
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
	let isImageModalOpen = $state(false)
	let selectedImage = $state<any | null>(null)

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
		if (files.length === 0 || disabled) return

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
				console.log('[GalleryUploader] Upload completed:', {
					uploadedCount: uploadedMedia.length,
					uploaded: uploadedMedia.map((m) => ({ id: m.id, filename: m.filename })),
					currentValue: value?.map((v) => ({ id: v.id, mediaId: v.mediaId, filename: v.filename }))
				})

				// Don't update value here - let parent handle it through API response
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

	// Drag and drop reordering handlers
	function handleImageDragStart(event: DragEvent, index: number) {
		// Prevent reordering while uploading or disabled
		if (isUploading || disabled) {
			event.preventDefault()
			return
		}

		draggedIndex = index
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move'
		}

		// Debug logging
		console.log('[GalleryUploader] Drag start:', {
			index,
			item: value[index],
			totalItems: value.length
		})
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

		if (draggedIndex === null || !value || isUploading || disabled) return

		// Debug logging before reorder
		console.log('[GalleryUploader] Before reorder:', {
			draggedIndex,
			dropIndex,
			totalItems: value.length,
			items: value.map((v, i) => ({
				index: i,
				id: v.id,
				mediaId: v.mediaId,
				filename: v.filename
			}))
		})

		const newValue = [...value]
		const draggedItem = newValue[draggedIndex]

		// Remove from old position
		newValue.splice(draggedIndex, 1)

		// Insert at new position (adjust index if dragging to later position)
		const adjustedDropIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex
		newValue.splice(adjustedDropIndex, 0, draggedItem)

		// Debug logging after reorder
		console.log('[GalleryUploader] After reorder:', {
			adjustedDropIndex,
			newItems: newValue.map((v, i) => ({
				index: i,
				id: v.id,
				mediaId: v.mediaId,
				filename: v.filename
			}))
		})

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

		// Debug logging
		console.log('[GalleryUploader] Media selected from library:', {
			selectedCount: mediaArray.length,
			selected: mediaArray.map((m) => ({ id: m.id, filename: m.filename })),
			currentValue: value?.map((v) => ({ id: v.id, mediaId: v.mediaId, filename: v.filename }))
		})

		// Filter out duplicates before passing to parent
		// Create a comprehensive set of existing IDs (both id and mediaId)
		const existingIds = new Set()
		value?.forEach((m) => {
			if (m.id) existingIds.add(m.id)
			if (m.mediaId) existingIds.add(m.mediaId)
		})

		// Filter out any media that already exists (check both id and potential mediaId)
		const newMedia = mediaArray.filter((media) => {
			return !existingIds.has(media.id) && !existingIds.has(media.mediaId)
		})

		console.log('[GalleryUploader] Filtered new media:', {
			newCount: newMedia.length,
			newMedia: newMedia.map((m) => ({ id: m.id, filename: m.filename }))
		})

		if (newMedia.length > 0) {
			// Don't modify the value array here - let the parent component handle it
			// through the API calls and then update the bound value
			onUpload(newMedia)
		}
	}

	function handleMediaLibraryClose() {
		isMediaLibraryOpen = false
	}

	// Handle clicking on an image to open details modal
	function handleImageClick(media: any) {
		// Convert to Media format if needed
		selectedImage = {
			id: media.mediaId || media.id,
			filename: media.filename,
			originalName: media.originalName || media.filename,
			mimeType: media.mimeType || 'image/jpeg',
			size: media.size || 0,
			url: media.url,
			thumbnailUrl: media.thumbnailUrl,
			width: media.width,
			height: media.height,
			altText: media.altText || '',
			description: media.description || '',
			isPhotography: media.isPhotography || false,
			createdAt: media.createdAt,
			updatedAt: media.updatedAt,
			exifData: media.exifData || null,
			usedIn: media.usedIn || []
		}
		isImageModalOpen = true
	}

	// Handle updates from the media details modal
	function handleImageUpdate(updatedMedia: any) {
		// Update the media in our value array
		const index = value.findIndex((m) => (m.mediaId || m.id) === updatedMedia.id)
		if (index !== -1) {
			value[index] = {
				...value[index],
				altText: updatedMedia.altText,
				description: updatedMedia.description,
				isPhotography: updatedMedia.isPhotography,
				updatedAt: updatedMedia.updatedAt
			}
			value = [...value] // Trigger reactivity
		}

		// Update selectedImage for the modal
		selectedImage = updatedMedia
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
			class:disabled
			ondragover={disabled ? undefined : handleDragOver}
			ondragleave={disabled ? undefined : handleDragLeave}
			ondrop={disabled ? undefined : handleDrop}
			onclick={disabled ? undefined : handleBrowseClick}
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
			<Button variant="primary" onclick={handleBrowseClick} {disabled}>
				{hasImages ? 'Add More Images' : 'Choose Images'}
			</Button>

			{#if showBrowseLibrary}
				<Button variant="ghost" onclick={handleBrowseLibrary} {disabled}>Browse Library</Button>
			{/if}
		</div>
	{/if}

	<!-- Image Gallery -->
	{#if hasImages}
		<div class="image-gallery">
			{#each value as media, index (`photo-${media.id || 'temp'}-${media.mediaId || 'new'}-${index}`)}
				<div
					class="gallery-item"
					class:dragging={draggedIndex === index}
					class:drag-over={draggedOverIndex === index}
					class:disabled
					draggable={!disabled}
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
						<button
							class="image-button"
							type="button"
							onclick={() => handleImageClick(media)}
							aria-label="Edit image {media.filename}"
							{disabled}
						>
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
						</button>

						<!-- Remove Button -->
						<button
							class="remove-button"
							onclick={(e) => {
								e.stopPropagation()
								handleRemoveImage(index)
							}}
							type="button"
							aria-label="Remove image"
							{disabled}
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

<!-- Media Details Modal -->
<MediaDetailsModal
	bind:isOpen={isImageModalOpen}
	media={selectedImage}
	onClose={() => {
		isImageModalOpen = false
		selectedImage = null
	}}
	onUpdate={handleImageUpdate}
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

		&.disabled {
			opacity: 0.6;
			cursor: not-allowed;

			&:hover {
				border-color: $grey-80;
				background-color: $grey-97;
			}
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

		&.disabled {
			opacity: 0.6;
			cursor: not-allowed;

			.drag-handle {
				cursor: not-allowed;
			}

			&:hover .drag-handle {
				opacity: 0;
			}
		}
	}

	.image-preview {
		position: relative;
		aspect-ratio: 1;
		overflow: hidden;
		background-color: $grey-97;

		.image-button {
			width: 100%;
			height: 100%;
			padding: 0;
			border: none;
			background: none;
			cursor: pointer;
			transition: transform 0.2s ease;

			&:hover:not(:disabled) {
				transform: scale(1.02);
			}

			&:disabled {
				cursor: not-allowed;
			}

			:global(.gallery-image) {
				width: 100%;
				height: 100%;
				object-fit: contain;
				display: block;
			}
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
			z-index: 1;

			&:hover {
				background: white;
				color: $red-60;
				box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
			}

			&:disabled {
				cursor: not-allowed;
			}
		}

		&:hover .remove-button {
			opacity: 1;
		}
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
