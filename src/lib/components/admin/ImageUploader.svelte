<script lang="ts">
	import type { Media } from '@prisma/client'
	import Button from './Button.svelte'
	import Input from './Input.svelte'
	import SmartImage from '../SmartImage.svelte'
	import MediaLibraryModal from './MediaLibraryModal.svelte'
	import { authenticatedFetch } from '$lib/admin-auth'
	import RefreshIcon from '$icons/refresh.svg?component'

	interface Props {
		label: string
		value?: Media | null
		onUpload: (media: Media) => void
		aspectRatio?: string // e.g., "16:9", "1:1"
		required?: boolean
		error?: string
		allowAltText?: boolean
		maxFileSize?: number // MB limit
		placeholder?: string
		helpText?: string
		showBrowseLibrary?: boolean // Show secondary "Browse Library" button
		compact?: boolean // Use compact layout with smaller preview and side-by-side alt text
	}

	let {
		label,
		value = $bindable(),
		onUpload,
		aspectRatio,
		required = false,
		error,
		allowAltText = true,
		maxFileSize = 10,
		placeholder = 'Drag and drop an image here, or click to browse',
		helpText,
		showBrowseLibrary = false,
		compact = false
	}: Props = $props()

	// State
	let isUploading = $state(false)
	let uploadProgress = $state(0)
	let uploadError = $state<string | null>(null)
	let isDragOver = $state(false)
	let fileInputElement: HTMLInputElement
	let altTextValue = $state(value?.altText || '')
	let descriptionValue = $state(value?.description || '')
	let isMediaLibraryOpen = $state(false)

	// Computed properties
	const hasValue = $derived(!!value)
	const aspectRatioStyle = $derived(() => {
		if (!aspectRatio) return ''
		const [w, h] = aspectRatio.split(':').map(Number)
		const ratio = (h / w) * 100
		return `aspect-ratio: ${w}/${h}; padding-bottom: ${ratio}%;`
	})

	// File validation
	function validateFile(file: File): string | null {
		// Check file type
		if (!file.type.startsWith('image/')) {
			return 'Please select an image file'
		}

		// Check file size
		const sizeMB = file.size / 1024 / 1024
		if (sizeMB > maxFileSize) {
			return `File size must be less than ${maxFileSize}MB`
		}

		return null
	}

	// Upload file to server
	async function uploadFile(file: File): Promise<Media> {
		const formData = new FormData()
		formData.append('file', file)

		if (allowAltText && altTextValue.trim()) {
			formData.append('altText', altTextValue.trim())
		}

		if (allowAltText && descriptionValue.trim()) {
			formData.append('description', descriptionValue.trim())
		}

		const response = await authenticatedFetch('/api/media/upload', {
			method: 'POST',
			body: formData
		})

		if (!response.ok) {
			const errorData = await response.json()
			throw new Error(errorData.error || 'Upload failed')
		}

		return await response.json()
	}

	// Handle file selection/drop
	async function handleFiles(files: FileList) {
		if (files.length === 0) return

		const file = files[0]
		const validationError = validateFile(file)

		if (validationError) {
			uploadError = validationError
			return
		}

		uploadError = null
		isUploading = true
		uploadProgress = 0

		try {
			// Simulate progress for user feedback
			const progressInterval = setInterval(() => {
				if (uploadProgress < 90) {
					uploadProgress += Math.random() * 10
				}
			}, 100)

			const uploadedMedia = await uploadFile(file)

			clearInterval(progressInterval)
			uploadProgress = 100

			// Brief delay to show completion
			setTimeout(() => {
				value = uploadedMedia
				altTextValue = uploadedMedia.altText || ''
				descriptionValue = uploadedMedia.description || ''
				onUpload(uploadedMedia)
				isUploading = false
				uploadProgress = 0
			}, 500)
		} catch (err) {
			isUploading = false
			uploadProgress = 0
			uploadError = err instanceof Error ? err.message : 'Upload failed'
		}
	}

	// Drag and drop handlers
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

	// Remove uploaded image
	function handleRemove() {
		value = null
		altTextValue = ''
		descriptionValue = ''
		uploadError = null
	}

	// Update alt text on server
	async function handleAltTextChange() {
		if (!value) return

		try {
			const response = await authenticatedFetch(`/api/media/${value.id}/metadata`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					altText: altTextValue.trim() || null
				})
			})

			if (response.ok) {
				const updatedData = await response.json()
				value = { ...value, altText: updatedData.altText, updatedAt: updatedData.updatedAt }
			}
		} catch (error) {
			console.error('Failed to update alt text:', error)
		}
	}

	async function handleDescriptionChange() {
		if (!value) return

		try {
			const response = await authenticatedFetch(`/api/media/${value.id}/metadata`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					description: descriptionValue.trim() || null
				})
			})

			if (response.ok) {
				const updatedData = await response.json()
				value = { ...value, description: updatedData.description, updatedAt: updatedData.updatedAt }
			}
		} catch (error) {
			console.error('Failed to update description:', error)
		}
	}

	// Browse library handler
	function handleBrowseLibrary() {
		isMediaLibraryOpen = true
	}

	function handleMediaSelect(selectedMedia: Media | Media[]) {
		// Since this is single mode, selectedMedia will be a single Media object
		const media = selectedMedia as Media
		value = media
		altTextValue = media.altText || ''
		descriptionValue = media.description || ''
		onUpload(media)
	}

	function handleMediaLibraryClose() {
		isMediaLibraryOpen = false
	}
</script>

<div class="image-uploader" class:compact>
	<!-- Label -->
	<label class="uploader-label">
		{label}
		{#if required}
			<span class="required">*</span>
		{/if}
	</label>

	{#if helpText}
		<p class="help-text">{helpText}</p>
	{/if}

	<!-- Upload Area or Preview -->
	<div class="upload-container">
		{#if hasValue && !isUploading}
			{#if compact}
				<!-- Compact Layout: Image and metadata side-by-side -->
				<div class="compact-preview">
					<div class="compact-image">
						<SmartImage
							media={value}
							alt={value?.altText || value?.filename || 'Uploaded image'}
							containerWidth={100}
							loading="eager"
							{aspectRatio}
							class="preview-image"
						/>

						<!-- Overlay with actions -->
						<div class="preview-overlay">
							<div class="preview-actions">
								<Button variant="overlay" buttonSize="small" onclick={handleBrowseClick}>
									<RefreshIcon slot="icon" width="12" height="12" />
								</Button>

								<Button variant="overlay" buttonSize="small" onclick={handleRemove}>
									<svg
										slot="icon"
										width="12"
										height="12"
										viewBox="0 0 24 24"
										fill="none"
										xmlns="http://www.w3.org/2000/svg"
									>
										<polyline
											points="3,6 5,6 21,6"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										/>
										<path
											d="M19 6V20A2 2 0 0 1 17 22H7A2 2 0 0 1 5 20V6M8 6V4A2 2 0 0 1 10 2H14A2 2 0 0 1 16 4V6"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										/>
									</svg>
								</Button>
							</div>
						</div>
					</div>

					<div class="compact-info">
						<!-- Alt Text Input in compact mode -->
						{#if allowAltText}
							<div class="compact-metadata">
								<Input
									type="text"
									label="Alt Text"
									bind:value={altTextValue}
									placeholder="Describe this image for screen readers"
									buttonSize="small"
									onblur={handleAltTextChange}
								/>

								<Input
									type="textarea"
									label="Description (Optional)"
									bind:value={descriptionValue}
									placeholder="Additional description or caption"
									rows={2}
									buttonSize="small"
									onblur={handleDescriptionChange}
								/>
							</div>
						{/if}
					</div>
				</div>
			{:else}
				<!-- Standard Layout: Image preview -->
				<div class="image-preview" style={aspectRatioStyle}>
					<SmartImage
						media={value}
						alt={value?.altText || value?.filename || 'Uploaded image'}
						containerWidth={800}
						loading="eager"
						{aspectRatio}
						class="preview-image"
					/>

					<!-- Overlay with actions -->
					<div class="preview-overlay">
						<div class="preview-actions">
							<Button variant="overlay" buttonSize="small" onclick={handleBrowseClick}>
								<RefreshIcon slot="icon" width="16" height="16" />
								Replace
							</Button>

							<Button variant="overlay" buttonSize="small" onclick={handleRemove}>
								<svg
									slot="icon"
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<polyline
										points="3,6 5,6 21,6"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
									<path
										d="M19 6V20A2 2 0 0 1 17 22H7A2 2 0 0 1 5 20V6M8 6V4A2 2 0 0 1 10 2H14A2 2 0 0 1 16 4V6"
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
				</div>

				<!-- File Info -->
				<div class="file-info">
					<p class="filename">{value?.originalName || value?.filename}</p>
					<p class="file-meta">
						{Math.round((value?.size || 0) / 1024)} KB
						{#if value?.width && value?.height}
							• {value.width}×{value.height}
						{/if}
					</p>
				</div>
			{/if}
		{:else}
			<!-- Upload Drop Zone -->
			<div
				class="drop-zone"
				class:drag-over={isDragOver}
				class:uploading={isUploading}
				class:has-error={!!uploadError}
				style={aspectRatioStyle}
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
						<p class="upload-text">Uploading... {Math.round(uploadProgress)}%</p>
						<div class="progress-bar">
							<div class="progress-fill" style="width: {uploadProgress}%"></div>
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
						</p>
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Action Buttons -->
	{#if !hasValue && !isUploading}
		<div class="action-buttons">
			<Button variant="primary" onclick={handleBrowseClick}>Choose File</Button>

			{#if showBrowseLibrary}
				<Button variant="ghost" onclick={handleBrowseLibrary}>Browse Library</Button>
			{/if}
		</div>
	{/if}

	<!-- Alt Text Input (only in standard mode, compact mode has it inline) -->
	{#if allowAltText && hasValue && !compact}
		<div class="metadata-section">
			<Input
				type="text"
				label="Alt Text"
				bind:value={altTextValue}
				placeholder="Describe this image for screen readers"
				helpText="Help make your content accessible. Describe what's in the image."
				onblur={handleAltTextChange}
			/>

			<Input
				type="textarea"
				label="Description (Optional)"
				bind:value={descriptionValue}
				placeholder="Additional description or caption"
				rows={2}
				onblur={handleDescriptionChange}
			/>
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
		style="display: none;"
		onchange={handleFileInputChange}
	/>
</div>

<!-- Media Library Modal -->
<MediaLibraryModal
	bind:isOpen={isMediaLibraryOpen}
	mode="single"
	fileType="image"
	title="Select Image"
	confirmText="Select Image"
	onSelect={handleMediaSelect}
	onClose={handleMediaLibraryClose}
/>

<style lang="scss">
	.image-uploader {
		display: flex;
		flex-direction: column;
		gap: $unit-2x;

		&.compact {
			gap: $unit;
		}
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

	.upload-container {
		position: relative;
	}

	// Drop Zone Styles
	.drop-zone {
		border: 2px dashed $grey-80;
		border-radius: $card-corner-radius;
		background-color: $grey-97;
		cursor: pointer;
		transition: all 0.2s ease;
		min-height: 200px;
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
		padding: $unit-4x;

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
		padding: $unit-4x;

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

		.progress-bar {
			width: 200px;
			height: 4px;
			background-color: $grey-90;
			border-radius: 2px;
			overflow: hidden;
			margin: 0 auto;

			.progress-fill {
				height: 100%;
				background-color: $blue-60;
				transition: width 0.3s ease;
			}
		}
	}

	// Image Preview Styles
	.image-preview {
		position: relative;
		border-radius: $card-corner-radius;
		overflow: hidden;
		background-color: $grey-95;
		min-height: 200px;

		:global(.preview-image) {
			width: 100%;
			height: 100%;
			object-fit: cover;
			display: block;
		}

		.preview-overlay {
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			background: rgba(0, 0, 0, 0.5);
			display: flex;
			align-items: center;
			justify-content: center;
			opacity: 0;
			transition: opacity 0.2s ease;
		}

		&:hover .preview-overlay {
			opacity: 1;
		}

		.preview-actions {
			display: flex;
			gap: $unit;
		}
	}

	.file-info {
		margin-top: $unit-2x;

		.filename {
			margin: 0 0 $unit-half 0;
			font-size: 0.875rem;
			font-weight: 500;
			color: $grey-10;
		}

		.file-meta {
			margin: 0;
			font-size: 0.75rem;
			color: $grey-40;
		}
	}

	.action-buttons {
		display: flex;
		gap: $unit-2x;
		align-items: center;
	}

	.metadata-section {
		display: flex;
		flex-direction: column;
		gap: $unit-2x;
		padding: $unit-3x;
		background-color: $grey-97;
		border-radius: $card-corner-radius;
		border: 1px solid $grey-90;
	}

	.error-message {
		margin: 0;
		font-size: 0.75rem;
		color: $red-60;
		padding: $unit;
		background-color: rgba($red-60, 0.05);
		border-radius: $card-corner-radius;
		border: 1px solid rgba($red-60, 0.2);
	}

	// Compact layout styles
	.compact-preview {
		display: flex;
		gap: $unit-3x;
		align-items: flex-start;
	}

	.compact-image {
		position: relative;
		width: 100px;
		height: 100px;
		flex-shrink: 0;
		border-radius: $card-corner-radius;
		overflow: hidden;
		background-color: $grey-95;
		border: 1px solid $grey-90;

		:global(.preview-image) {
			width: 100%;
			height: 100%;
			object-fit: contain;
			display: block;
			padding: $unit-3x;
			box-sizing: border-box;
		}

		.preview-overlay {
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			background: rgba(0, 0, 0, 0.7);
			display: flex;
			align-items: center;
			justify-content: center;
			opacity: 0;
			transition: opacity 0.2s ease;
		}

		&:hover .preview-overlay {
			opacity: 1;
		}

		.preview-actions {
			display: flex;
			gap: $unit-half;
		}
	}

	.compact-info {
		flex: 1;
		display: flex;
		flex-direction: column;

		.compact-metadata {
			display: flex;
			flex-direction: column;
			gap: $unit-2x;
		}
	}

	// Responsive adjustments
	@media (max-width: 640px) {
		.upload-prompt {
			padding: $unit-3x;

			.upload-main-text {
				font-size: 0.8rem;
			}
		}

		.action-buttons {
			flex-direction: column;
			align-items: stretch;
		}

		.preview-actions {
			flex-direction: column;
		}
	}
</style>
