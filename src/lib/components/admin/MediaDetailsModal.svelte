<script lang="ts">
	import Modal from './Modal.svelte'
	import Button from './Button.svelte'
	import Input from './Input.svelte'
	import Textarea from './Textarea.svelte'
	import SmartImage from '../SmartImage.svelte'
	import { authenticatedFetch } from '$lib/admin-auth'
	import type { Media } from '@prisma/client'

	interface Props {
		isOpen: boolean
		media: Media | null
		onClose: () => void
		onUpdate: (updatedMedia: Media) => void
	}

	let { isOpen = $bindable(), media, onClose, onUpdate }: Props = $props()

	// Form state
	let description = $state('')
	let isPhotography = $state(false)
	let isSaving = $state(false)
	let error = $state('')
	let successMessage = $state('')

	// Usage tracking state
	let usage = $state<
		Array<{
			contentType: string
			contentId: number
			contentTitle: string
			fieldDisplayName: string
			contentUrl?: string
			createdAt: string
		}>
	>([])
	let loadingUsage = $state(false)

	// EXIF toggle state
	let showExif = $state(false)

	// Initialize form when media changes
	$effect(() => {
		if (media) {
			// Use description if available, otherwise fall back to altText for backwards compatibility
			description = media.description || media.altText || ''
			isPhotography = media.isPhotography || false
			error = ''
			successMessage = ''
			showExif = false
			loadUsage()
		}
	})

	// Load usage information
	async function loadUsage() {
		if (!media) return

		try {
			loadingUsage = true
			const response = await authenticatedFetch(`/api/media/${media.id}/usage`)

			if (response.ok) {
				const data = await response.json()
				usage = data.usage || []
			} else {
				console.warn('Failed to load media usage')
				usage = []
			}
		} catch (error) {
			console.error('Error loading media usage:', error)
			usage = []
		} finally {
			loadingUsage = false
		}
	}

	function handleClose() {
		description = ''
		isPhotography = false
		error = ''
		successMessage = ''
		isOpen = false
		onClose()
	}

	async function handleSave() {
		if (!media) return

		try {
			isSaving = true
			error = ''

			const response = await authenticatedFetch(`/api/media/${media.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					// Use description for both altText and description fields
					altText: description.trim() || null,
					description: description.trim() || null,
					isPhotography: isPhotography
				})
			})

			if (!response.ok) {
				throw new Error('Failed to update media')
			}

			const updatedMedia = await response.json()
			onUpdate(updatedMedia)
			successMessage = 'Media updated successfully!'

			// Auto-close after success
			setTimeout(() => {
				handleClose()
			}, 1500)
		} catch (err) {
			error = 'Failed to update media. Please try again.'
			console.error('Failed to update media:', err)
		} finally {
			isSaving = false
		}
	}

	async function handleDelete() {
		if (
			!media ||
			!confirm('Are you sure you want to delete this media file? This action cannot be undone.')
		) {
			return
		}

		try {
			isSaving = true
			error = ''

			const response = await authenticatedFetch(`/api/media/${media.id}`, {
				method: 'DELETE'
			})

			if (!response.ok) {
				throw new Error('Failed to delete media')
			}

			// Close modal and let parent handle the deletion
			handleClose()
			// Note: Parent component should refresh the media list
		} catch (err) {
			error = 'Failed to delete media. Please try again.'
			console.error('Failed to delete media:', err)
		} finally {
			isSaving = false
		}
	}

	function copyUrl() {
		if (media?.url) {
			navigator.clipboard
				.writeText(media.url)
				.then(() => {
					successMessage = 'URL copied to clipboard!'
					setTimeout(() => {
						successMessage = ''
					}, 2000)
				})
				.catch(() => {
					error = 'Failed to copy URL'
					setTimeout(() => {
						error = ''
					}, 2000)
				})
		}
	}

	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 Bytes'
		const k = 1024
		const sizes = ['Bytes', 'KB', 'MB', 'GB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
	}

	function getFileType(mimeType: string): string {
		if (mimeType.startsWith('image/')) return 'Image'
		if (mimeType.startsWith('video/')) return 'Video'
		if (mimeType.startsWith('audio/')) return 'Audio'
		if (mimeType.includes('pdf')) return 'PDF'
		return 'File'
	}
</script>

{#if media}
	<Modal
		bind:isOpen
		size="jumbo"
		closeOnBackdrop={!isSaving}
		closeOnEscape={!isSaving}
		onClose={handleClose}
		showCloseButton={false}
	>
		<div class="media-details-modal">
			<!-- Left Pane - Image Preview -->
			<div class="image-pane">
				{#if media.mimeType.startsWith('image/')}
					<div class="image-container">
						<SmartImage
							{media}
							alt={media.description || media.altText || media.filename}
							class="preview-image"
						/>
					</div>
				{:else}
					<div class="file-placeholder">
						<svg
							width="64"
							height="64"
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
						</svg>
						<span class="file-type">{getFileType(media.mimeType)}</span>
					</div>
				{/if}
			</div>

			<!-- Right Pane - Details -->
			<div class="details-pane">
				<!-- Header -->
				<div class="pane-header">
					<h2 class="filename-header">{media.filename}</h2>
					<div class="header-actions">
						{#if !isSaving}
							<Button variant="ghost" onclick={copyUrl} iconOnly aria-label="Copy URL">
								<svg
									slot="icon"
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<rect
										x="9"
										y="9"
										width="13"
										height="13"
										rx="2"
										stroke="currentColor"
										stroke-width="2"
									/>
									<path
										d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5"
										stroke="currentColor"
										stroke-width="2"
									/>
								</svg>
							</Button>
							<Button variant="ghost" onclick={handleClose} iconOnly aria-label="Close modal">
								<svg
									slot="icon"
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										d="M6 6L18 18M6 18L18 6"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
									/>
								</svg>
							</Button>
						{/if}
					</div>
				</div>
				<div class="pane-body">
					<div class="file-info">
						<div class="info-grid">
							<div class="info-item">
								<span class="label">Type</span>
								<span class="value">{getFileType(media.mimeType)}</span>
							</div>
							<div class="info-item">
								<span class="label">Size</span>
								<span class="value">{formatFileSize(media.size)}</span>
							</div>
							{#if media.width && media.height}
								<div class="info-item">
									<span class="label">Dimensions</span>
									<span class="value">{media.width} × {media.height}px</span>
								</div>
							{/if}
							{#if media.dominantColor}
								<div class="info-item">
									<span class="label">Dominant Color</span>
									<span class="value color-value">
										<span 
											class="color-swatch" 
											style="background-color: {media.dominantColor}"
											title={media.dominantColor}
										></span>
										{media.dominantColor}
									</span>
								</div>
							{:else}
								<!-- Debug: dominantColor = {JSON.stringify(media.dominantColor)} -->
							{/if}
							<div class="info-item">
								<span class="label">Uploaded</span>
								<span class="value">{new Date(media.createdAt).toLocaleDateString()}</span>
							</div>
						</div>

						{#if media.exifData && Object.keys(media.exifData).length > 0}
							{#if showExif}
								<div class="exif-data">
									{#if media.exifData.camera}
										<div class="info-item">
											<span class="label">Camera</span>
											<span class="value">{media.exifData.camera}</span>
										</div>
									{/if}
									{#if media.exifData.lens}
										<div class="info-item">
											<span class="label">Lens</span>
											<span class="value">{media.exifData.lens}</span>
										</div>
									{/if}
									{#if media.exifData.focalLength}
										<div class="info-item">
											<span class="label">Focal Length</span>
											<span class="value">{media.exifData.focalLength}</span>
										</div>
									{/if}
									{#if media.exifData.aperture}
										<div class="info-item">
											<span class="label">Aperture</span>
											<span class="value">{media.exifData.aperture}</span>
										</div>
									{/if}
									{#if media.exifData.shutterSpeed}
										<div class="info-item">
											<span class="label">Shutter Speed</span>
											<span class="value">{media.exifData.shutterSpeed}</span>
										</div>
									{/if}
									{#if media.exifData.iso}
										<div class="info-item">
											<span class="label">ISO</span>
											<span class="value">{media.exifData.iso}</span>
										</div>
									{/if}
									{#if media.exifData.dateTaken}
										<div class="info-item">
											<span class="label">Date Taken</span>
											<span class="value"
												>{new Date(media.exifData.dateTaken).toLocaleDateString()}</span
											>
										</div>
									{/if}
									{#if media.exifData.coordinates}
										<div class="info-item">
											<span class="label">GPS</span>
											<span class="value">
												{media.exifData.coordinates.latitude.toFixed(6)},
												{media.exifData.coordinates.longitude.toFixed(6)}
											</span>
										</div>
									{/if}
								</div>
							{/if}

							<Button
								variant="ghost"
								onclick={() => (showExif = !showExif)}
								buttonSize="small"
								fullWidth
								pill={false}
								class="exif-toggle"
							>
								{showExif ? 'Hide EXIF' : 'Show EXIF'}
							</Button>
						{/if}
					</div>

					<div class="pane-body-content">
						<!-- Photography Toggle -->
						<div class="photography-toggle">
							<label class="toggle-label">
								<input
									type="checkbox"
									bind:checked={isPhotography}
									disabled={isSaving}
									class="toggle-input"
								/>
								<div class="toggle-content">
									<span class="toggle-title">Show in Photos</span>
									<span class="toggle-description">This photo will be displayed in Photos</span>
								</div>
								<span class="toggle-slider"></span>
							</label>
						</div>

						<!-- Edit Form -->
						<div class="edit-form">
							<Textarea
								label="Description"
								bind:value={description}
								placeholder="Describe this image (used for alt text and captions)"
								rows={4}
								disabled={isSaving}
								fullWidth
							/>

							<!-- Usage Tracking -->
							<div class="usage-section">
								<h4>Used In</h4>
								{#if loadingUsage}
									<div class="usage-loading">
										<div class="spinner"></div>
										<span>Loading usage information...</span>
									</div>
								{:else if usage.length > 0}
									<ul class="usage-list">
										{#each usage as usageItem}
											<li class="usage-item">
												<div class="usage-content">
													<div class="usage-header">
														{#if usageItem.contentUrl}
															<a
																href={usageItem.contentUrl}
																class="usage-title"
																target="_blank"
																rel="noopener"
															>
																{usageItem.contentTitle}
															</a>
														{:else}
															<span class="usage-title">{usageItem.contentTitle}</span>
														{/if}
														<span class="usage-type">{usageItem.contentType}</span>
													</div>
													<div class="usage-details">
														<span class="usage-field">{usageItem.fieldDisplayName}</span>
														<span class="usage-date"
															>Added {new Date(usageItem.createdAt).toLocaleDateString()}</span
														>
													</div>
												</div>
											</li>
										{/each}
									</ul>
								{:else}
									<p class="no-usage">This media file is not currently used in any content.</p>
								{/if}
							</div>
						</div>
					</div>
				</div>

				<!-- Footer -->
				<div class="pane-footer">
					<div class="footer-left">
						<Button
							variant="ghost"
							onclick={handleDelete}
							disabled={isSaving}
							class="delete-button"
						>
							Delete
						</Button>
					</div>

					<div class="footer-right">
						{#if error}
							<span class="error-text">{error}</span>
						{/if}
						{#if successMessage}
							<span class="success-text">{successMessage}</span>
						{/if}

						<Button variant="primary" onclick={handleSave} disabled={isSaving}>
							{isSaving ? 'Saving...' : 'Save Changes'}
						</Button>
					</div>
				</div>
			</div>
		</div>
	</Modal>
{/if}

<style lang="scss">
	.media-details-modal {
		display: flex;
		height: 100%;
		overflow: hidden;
	}

	// Left pane - Image preview
	.image-pane {
		flex: 1;
		background-color: #000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: $unit-4x;
		position: relative;
		overflow: hidden;

		.image-container {
			max-width: 90%;
			max-height: 90%;
			position: relative;
			display: flex;
			align-items: center;
			justify-content: center;

			:global(.preview-image) {
				width: 100%;
				height: 100%;
				object-fit: contain;
				border-radius: $corner-radius-md;
				display: block;
			}
		}

		.file-placeholder {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: $unit-2x;
			color: rgba(255, 255, 255, 0.6);

			.file-type {
				font-size: 0.875rem;
				font-weight: 500;
			}
		}
	}

	// Right pane - Details
	.details-pane {
		width: 400px;
		background-color: white;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.pane-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: $unit-2x $unit-3x;
		border-bottom: 1px solid rgba(0, 0, 0, 0.08);
		flex-shrink: 0;
		gap: $unit-2x;

		.filename-header {
			flex: 1;
			font-size: 1.125rem;
			font-weight: 500;
			margin: 0;
			color: $grey-10;
			word-break: break-all;
			line-height: 1.5;
		}

		.header-actions {
			display: flex;
			align-items: center;
			gap: $unit;
		}
	}

	.pane-body {
		flex: 1;
		overflow-y: auto;
	}

	.pane-body-content {
		padding: $unit-3x;
		display: flex;
		flex-direction: column;
		gap: $unit-6x;
	}

	.file-info {
		display: flex;
		flex-direction: column;
		gap: $unit-3x;
		padding: $unit-3x;
		background-color: $grey-90;
		border-bottom: 1px solid rgba(0, 0, 0, 0.08);
	}

	.info-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: $unit-3x;
	}

	.info-item {
		display: flex;
		flex-direction: column;
		gap: $unit-half;

		&.vertical {
			grid-column: 1 / -1;
		}

		.label {
			font-size: 0.75rem;
			font-weight: 500;
			color: $grey-50;
			text-transform: uppercase;
			letter-spacing: 0.05em;
		}

		.value {
			font-size: 0.875rem;
			color: $grey-10;
			font-weight: 500;
			
			&.color-value {
				display: flex;
				align-items: center;
				gap: $unit-2x;
			}
		}
	}
	
	.color-swatch {
		display: inline-block;
		width: 20px;
		height: 20px;
		border-radius: 4px;
		border: 1px solid rgba(0, 0, 0, 0.1);
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
	}

	:global(.btn.btn-ghost.exif-toggle) {
		margin-top: $unit-2x;
		justify-content: center;
		background: transparent;
		border: 1px solid $grey-70;

		&:hover {
			background: rgba(0, 0, 0, 0.02);
			border-color: $grey-70;
		}
	}

	.exif-data {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: $unit-3x;
		padding-top: $unit-3x;
		border-top: 1px solid $grey-90;
	}

	.edit-form {
		display: flex;
		flex-direction: column;
		gap: $unit-4x;

		h4 {
			font-size: 1rem;
			font-weight: 600;
			margin: 0;
			color: $grey-20;
		}
	}

	.photography-toggle {
		.toggle-label {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: $unit-3x;
			cursor: pointer;
			user-select: none;
		}

		.toggle-input {
			position: absolute;
			opacity: 0;
			pointer-events: none;

			&:checked + .toggle-content + .toggle-slider {
				background-color: $blue-60;

				&::before {
					transform: translateX(20px);
				}
			}

			&:disabled + .toggle-content + .toggle-slider {
				opacity: 0.5;
				cursor: not-allowed;
			}
		}

		.toggle-slider {
			position: relative;
			width: 44px;
			height: 24px;
			background-color: $grey-80;
			border-radius: 12px;
			transition: background-color 0.2s ease;
			flex-shrink: 0;

			&::before {
				content: '';
				position: absolute;
				top: 2px;
				left: 2px;
				width: 20px;
				height: 20px;
				background-color: white;
				border-radius: 50%;
				transition: transform 0.2s ease;
				box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
			}
		}

		.toggle-content {
			display: flex;
			flex-direction: column;
			gap: $unit-half;

			.toggle-title {
				font-weight: 500;
				color: $grey-10;
				font-size: 0.875rem;
			}

			.toggle-description {
				font-size: 0.75rem;
				color: $grey-50;
				line-height: 1.4;
			}
		}
	}

	.usage-section {
		.usage-list {
			list-style: none;
			padding: 0;
			margin: $unit-2x 0 0 0;
			display: flex;
			flex-direction: column;
			gap: $unit;
		}

		.usage-loading {
			display: flex;
			align-items: center;
			gap: $unit-2x;
			padding: $unit-2x;
			color: $grey-50;

			.spinner {
				width: 16px;
				height: 16px;
				border: 2px solid $grey-90;
				border-top: 2px solid $grey-50;
				border-radius: 50%;
				animation: spin 1s linear infinite;
			}
		}

		.usage-item {
			padding: $unit-3x;
			background: $grey-95;
			border-radius: 12px;
			border: 1px solid $grey-90;

			.usage-content {
				display: flex;
				flex-direction: column;
				gap: $unit;
			}

			.usage-header {
				display: flex;
				align-items: center;
				justify-content: space-between;
				gap: $unit-2x;

				.usage-title {
					font-weight: 600;
					color: $grey-10;
					text-decoration: none;
					transition: color 0.2s ease;

					&:hover {
						color: $blue-60;
					}
				}

				.usage-type {
					background: $grey-85;
					color: $grey-30;
					padding: $unit-half $unit;
					border-radius: 6px;
					font-size: 0.75rem;
					font-weight: 500;
					text-transform: uppercase;
					letter-spacing: 0.5px;
					flex-shrink: 0;
				}
			}

			.usage-details {
				display: flex;
				align-items: center;
				gap: $unit-3x;

				.usage-field {
					color: $grey-40;
					font-size: 0.875rem;
					font-weight: 500;
				}

				.usage-date {
					color: $grey-50;
					font-size: 0.75rem;
				}
			}
		}

		.no-usage {
			color: $grey-50;
			font-style: italic;
			margin: $unit-2x 0 0 0;
		}
	}

	.pane-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: $unit-2x $unit-3x;
		border-top: 1px solid rgba(0, 0, 0, 0.08);
		flex-shrink: 0;

		.footer-left {
			:global(.delete-button) {
				color: $red-60;

				&:hover {
					background-color: rgba(239, 68, 68, 0.1);
				}
			}
		}

		.footer-right {
			display: flex;
			align-items: center;
			gap: $unit-2x;

			.error-text {
				color: $red-60;
				font-size: 0.875rem;
			}

			.success-text {
				color: #16a34a; // green-600 equivalent
				font-size: 0.875rem;
			}
		}
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	// Responsive adjustments
	@media (max-width: 768px) {
		.media-details-modal {
			flex-direction: column;
		}

		.image-pane {
			height: 300px;
			flex: none;
		}

		.details-pane {
			width: 100%;
			flex: 1;
		}

		.pane-header {
			padding: $unit-3x;
		}

		.pane-body {
			// padding: $unit-3x;
		}

		.pane-footer {
			padding: $unit-3x;
			flex-direction: column;
			gap: $unit-3x;
			align-items: stretch;

			.footer-right {
				justify-content: space-between;
			}
		}
	}
</style>
