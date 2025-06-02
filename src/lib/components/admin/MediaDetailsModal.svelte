<script lang="ts">
	import Modal from './Modal.svelte'
	import Button from './Button.svelte'
	import Input from './Input.svelte'
	import SmartImage from '../SmartImage.svelte'
	import { authenticatedFetch } from '$lib/admin-auth'
	import type { Media } from '@prisma/client'

	interface Props {
		isOpen: boolean
		media: Media | null
		onClose: () => void
		onUpdate: (updatedMedia: Media) => void
	}

	let {
		isOpen = $bindable(),
		media,
		onClose,
		onUpdate
	}: Props = $props()

	// Form state
	let altText = $state('')
	let description = $state('')
	let isPhotography = $state(false)
	let isSaving = $state(false)
	let error = $state('')
	let successMessage = $state('')

	// Usage tracking state
	let usage = $state<Array<{
		contentType: string
		contentId: number
		contentTitle: string
		fieldDisplayName: string
		contentUrl?: string
		createdAt: string
	}>>([])
	let loadingUsage = $state(false)

	// Initialize form when media changes
	$effect(() => {
		if (media) {
			altText = media.altText || ''
			description = media.description || ''
			isPhotography = media.isPhotography || false
			error = ''
			successMessage = ''
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
		altText = ''
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
					altText: altText.trim() || null,
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
		if (!media || !confirm('Are you sure you want to delete this media file? This action cannot be undone.')) {
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
			navigator.clipboard.writeText(media.url).then(() => {
				successMessage = 'URL copied to clipboard!'
				setTimeout(() => {
					successMessage = ''
				}, 2000)
			}).catch(() => {
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
	<Modal bind:isOpen size="large" closeOnBackdrop={!isSaving} closeOnEscape={!isSaving} on:close={handleClose}>
		<div class="media-details-modal">
			<!-- Header -->
			<div class="modal-header">
				<div class="header-content">
					<h2>Media Details</h2>
					<p class="filename">{media.filename}</p>
				</div>
				{#if !isSaving}
					<Button variant="ghost" onclick={handleClose} iconOnly aria-label="Close modal">
						<svg slot="icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M6 6L18 18M6 18L18 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
						</svg>
					</Button>
				{/if}
			</div>

			<!-- Content -->
			<div class="modal-body">
				<div class="media-preview-section">
					<!-- Media Preview -->
					<div class="media-preview">
						{#if media.mimeType.startsWith('image/')}
							<SmartImage {media} alt={media.altText || media.filename} />
						{:else}
							<div class="file-placeholder">
								<svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M14 2H6A2 2 0 0 0 4 4V20A2 2 0 0 0 6 22H18A2 2 0 0 0 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
									<polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
								</svg>
								<span class="file-type">{getFileType(media.mimeType)}</span>
							</div>
						{/if}
					</div>

					<!-- File Info -->
					<div class="file-info">
						<div class="info-row">
							<span class="label">Type:</span>
							<span class="value">{getFileType(media.mimeType)}</span>
						</div>
						<div class="info-row">
							<span class="label">Size:</span>
							<span class="value">{formatFileSize(media.size)}</span>
						</div>
						{#if media.width && media.height}
							<div class="info-row">
								<span class="label">Dimensions:</span>
								<span class="value">{media.width} × {media.height}px</span>
							</div>
						{/if}
						<div class="info-row">
							<span class="label">Uploaded:</span>
							<span class="value">{new Date(media.createdAt).toLocaleDateString()}</span>
						</div>
						<div class="info-row">
							<span class="label">URL:</span>
							<div class="url-section">
								<span class="url-text">{media.url}</span>
								<Button variant="ghost" size="small" onclick={copyUrl}>
									Copy
								</Button>
							</div>
						</div>
					</div>
				</div>

				<!-- Edit Form -->
				<div class="edit-form">
					<h3>Accessibility & SEO</h3>
					
					<Input
						type="text"
						label="Alt Text"
						bind:value={altText}
						placeholder="Describe this image for screen readers"
						helpText="Help make your content accessible. Describe what's in the image."
						disabled={isSaving}
						fullWidth
					/>
					
					<Input
						type="textarea"
						label="Description (Optional)"
						bind:value={description}
						placeholder="Additional description or caption"
						helpText="Optional longer description for context or captions."
						rows={3}
						disabled={isSaving}
						fullWidth
					/>

					<!-- Photography Toggle -->
					<div class="photography-toggle">
						<label class="toggle-label">
							<input
								type="checkbox"
								bind:checked={isPhotography}
								disabled={isSaving}
								class="toggle-input"
							/>
							<span class="toggle-slider"></span>
							<div class="toggle-content">
								<span class="toggle-title">Photography</span>
								<span class="toggle-description">Show this media in the photography experience</span>
							</div>
						</label>
					</div>

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
													<a href={usageItem.contentUrl} class="usage-title" target="_blank" rel="noopener">
														{usageItem.contentTitle}
													</a>
												{:else}
													<span class="usage-title">{usageItem.contentTitle}</span>
												{/if}
												<span class="usage-type">{usageItem.contentType}</span>
											</div>
											<div class="usage-details">
												<span class="usage-field">{usageItem.fieldDisplayName}</span>
												<span class="usage-date">Added {new Date(usageItem.createdAt).toLocaleDateString()}</span>
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

			<!-- Footer -->
			<div class="modal-footer">
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
					
					<Button variant="ghost" onclick={handleClose} disabled={isSaving}>
						Cancel
					</Button>
					<Button variant="primary" onclick={handleSave} disabled={isSaving}>
						{isSaving ? 'Saving...' : 'Save Changes'}
					</Button>
				</div>
			</div>
		</div>
	</Modal>
{/if}

<style lang="scss">
	.media-details-modal {
		display: flex;
		flex-direction: column;
		height: 100%;
		max-height: 90vh;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: $unit-4x;
		border-bottom: 1px solid $grey-90;
		flex-shrink: 0;

		.header-content {
			flex: 1;

			h2 {
				font-size: 1.5rem;
				font-weight: 600;
				margin: 0 0 $unit-half 0;
				color: $grey-10;
			}

			.filename {
				font-size: 0.875rem;
				color: $grey-40;
				margin: 0;
				word-break: break-all;
			}
		}
	}

	.modal-body {
		flex: 1;
		overflow-y: auto;
		padding: $unit-4x;
		display: flex;
		flex-direction: column;
		gap: $unit-6x;
	}

	.media-preview-section {
		display: grid;
		grid-template-columns: 300px 1fr;
		gap: $unit-4x;
		align-items: start;

		@include breakpoint('tablet') {
			grid-template-columns: 1fr;
			gap: $unit-3x;
		}
	}

	.media-preview {
		width: 100%;
		max-width: 300px;
		aspect-ratio: 4/3;
		border-radius: 12px;
		overflow: hidden;
		background: $grey-95;
		display: flex;
		align-items: center;
		justify-content: center;

		:global(img) {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}

		.file-placeholder {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: $unit-2x;
			color: $grey-50;

			.file-type {
				font-size: 0.875rem;
				font-weight: 500;
			}
		}
	}

	.file-info {
		display: flex;
		flex-direction: column;
		gap: $unit-2x;
	}

	.info-row {
		display: flex;
		align-items: center;
		gap: $unit-2x;

		.label {
			font-weight: 500;
			color: $grey-30;
			min-width: 80px;
		}

		.value {
			color: $grey-10;
			flex: 1;
		}

		.url-section {
			display: flex;
			align-items: center;
			gap: $unit-2x;
			flex: 1;

			.url-text {
				color: $grey-10;
				font-size: 0.875rem;
				word-break: break-all;
				flex: 1;
			}
		}
	}

	.edit-form {
		display: flex;
		flex-direction: column;
		gap: $unit-4x;

		h3 {
			font-size: 1.25rem;
			font-weight: 600;
			margin: 0;
			color: $grey-10;
		}

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
			gap: $unit-3x;
			cursor: pointer;
			user-select: none;
		}

		.toggle-input {
			position: absolute;
			opacity: 0;
			pointer-events: none;

			&:checked + .toggle-slider {
				background-color: $blue-60;

				&::before {
					transform: translateX(20px);
				}
			}

			&:disabled + .toggle-slider {
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

	.modal-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: $unit-4x;
		border-top: 1px solid $grey-90;
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
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	// Responsive adjustments
	@include breakpoint('phone') {
		.modal-header {
			padding: $unit-3x;
		}

		.modal-body {
			padding: $unit-3x;
		}

		.modal-footer {
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