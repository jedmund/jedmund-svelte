<script lang="ts">
	import Modal from './Modal.svelte'
	import Button from './Button.svelte'
	import Textarea from './Textarea.svelte'
	import SmartImage from '../SmartImage.svelte'
	import AlbumSelector from './AlbumSelector.svelte'
	import AlbumIcon from '$icons/album.svg?component'
	import CloseButton from '$components/icons/CloseButton.svelte'
	import FileIcon from '$components/icons/FileIcon.svelte'
	import CopyIcon from '$components/icons/CopyIcon.svelte'
	import MediaMetadataPanel from './MediaMetadataPanel.svelte'
	import MediaUsageList from './MediaUsageList.svelte'
	import { toast } from '$lib/stores/toast'
	import { getFileType, isVideoFile } from '$lib/utils/mediaHelpers'
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

	// Album management state
	let albums = $state<Array<{ id: number; title: string; slug: string }>>([])
	let showAlbumSelector = $state(false)

	// Initialize form when media changes
	$effect(() => {
		if (media) {
			description = media.description || ''
			isPhotography = media.isPhotography || false
			loadUsage()
			// Only load albums for images
			if (media.mimeType?.startsWith('image/')) {
				loadAlbums()
			}
		}
	})

	// Load usage information
	async function loadUsage() {
		if (!media) return

		try {
			loadingUsage = true
			const response = await fetch(`/api/media/${media.id}/usage`, {
				credentials: 'same-origin'
			})

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

	// Load albums the media belongs to
	async function loadAlbums() {
		if (!media) return

		try {
			// Load albums this media belongs to
			const mediaResponse = await fetch(`/api/media/${media.id}/albums`, {
				credentials: 'same-origin'
			})
			if (mediaResponse.ok) {
				const data = await mediaResponse.json()
				albums = data.albums || []
			}
		} catch (error) {
			console.error('Error loading albums:', error)
			albums = []
		}
	}

	function handleClose() {
		description = ''
		isPhotography = false
		isOpen = false
		onClose()
	}

	async function handleSave() {
		if (!media) return

		const loadingToastId = toast.loading('Saving changes...')

		try {
			isSaving = true

			const response = await fetch(`/api/media/${media.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					description: description.trim() || null,
					isPhotography: isPhotography
				}),
				credentials: 'same-origin'
			})

			if (!response.ok) {
				throw new Error('Failed to update media')
			}

			const updatedMedia = await response.json()
			onUpdate(updatedMedia)

			toast.dismiss(loadingToastId)
			toast.success('Media updated successfully!')

			// Auto-close after success
			setTimeout(() => {
				handleClose()
			}, 1500)
		} catch (err) {
			toast.dismiss(loadingToastId)
			toast.error('Failed to update media. Please try again.')
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

		const loadingToastId = toast.loading('Deleting media...')

		try {
			isSaving = true

			const response = await fetch(`/api/media/${media.id}`, {
				method: 'DELETE',
				credentials: 'same-origin'
			})

			if (!response.ok) {
				throw new Error('Failed to delete media')
			}

			toast.dismiss(loadingToastId)
			toast.success('Media deleted successfully')

			// Close modal and let parent handle the deletion
			handleClose()
			// Note: Parent component should refresh the media list
		} catch (err) {
			toast.dismiss(loadingToastId)
			toast.error('Failed to delete media. Please try again.')
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
					toast.success('URL copied to clipboard!')
				})
				.catch(() => {
					toast.error('Failed to copy URL')
				})
		}
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
			<!-- Left Pane - Media Preview -->
			<div class="image-pane">
				{#if media.mimeType.startsWith('image/')}
					<div class="image-container">
						<SmartImage {media} alt={media.description || media.filename} class="preview-image" />
					</div>
				{:else if isVideoFile(media.mimeType)}
					<div class="video-container">
						<video controls poster={media.thumbnailUrl || undefined} class="preview-video">
							<source src={media.url} type={media.mimeType} />
							Your browser does not support the video tag.
						</video>
					</div>
				{:else}
					<div class="file-placeholder">
						<FileIcon size={64} />
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
								<CopyIcon slot="icon" size={20} />
							</Button>
							<Button variant="ghost" onclick={handleClose} iconOnly aria-label="Close modal">
								<CloseButton slot="icon" />
							</Button>
						{/if}
					</div>
				</div>
				<div class="pane-body">
					<!-- Media Metadata Panel -->
					<MediaMetadataPanel {media} showExifToggle={true} />

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
								<div class="section-header">
									<h4>Used In</h4>
									{#if media.mimeType?.startsWith('image/')}
										<button
											class="add-album-button"
											onclick={() => (showAlbumSelector = true)}
											title="Manage albums"
										>
											<AlbumIcon />
											<span>Albums</span>
										</button>
									{/if}
								</div>
								<MediaUsageList {usage} loading={loadingUsage} />

								<!-- Albums list -->
								{#if albums.length > 0}
									<div class="albums-inline">
										<h4>Albums</h4>
										<div class="album-tags">
											{#each albums as album}
												<a href="/admin/albums/{album.id}/edit" class="album-tag">
													{album.title}
												</a>
											{/each}
										</div>
									</div>
								{/if}
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
							<Button variant="primary" onclick={handleSave} disabled={isSaving}
								>Save Changes</Button
							>
						</div>
					</div>
				</div>
			</div>
		</div></Modal
	>

	<!-- Album Selector Modal -->
	{#if showAlbumSelector && media}
		<Modal isOpen={showAlbumSelector} onClose={() => (showAlbumSelector = false)} size="medium">
			<AlbumSelector
				mediaId={media.id}
				currentAlbums={albums}
				onUpdate={(updatedAlbums) => {
					albums = updatedAlbums
					showAlbumSelector = false
				}}
				onClose={() => (showAlbumSelector = false)}
			/>
		</Modal>
	{/if}
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

		.video-container {
			max-width: 90%;
			position: relative;
			display: flex;
			align-items: center;
			justify-content: center;

			.preview-video {
				width: 100%;
				height: auto;
				max-width: 100%;
				object-fit: contain;
				background: #000;
				border-radius: $corner-radius-md;
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
		border-bottom: $unit-1px solid rgba(0, 0, 0, 0.08);
		flex-shrink: 0;
		gap: $unit-2x;

		.filename-header {
			flex: 1;
			font-size: 1.125rem;
			font-weight: 500;
			margin: 0;
			color: $gray-10;
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

	.edit-form {
		display: flex;
		flex-direction: column;
		gap: $unit-4x;

		h4 {
			font-size: 1rem;
			font-weight: 600;
			margin: 0;
			color: $gray-20;
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
					transform: translateX($unit-20px);
				}
			}

			&:disabled + .toggle-content + .toggle-slider {
				opacity: 0.5;
				cursor: not-allowed;
			}
		}

		.toggle-slider {
			position: relative;
			width: $unit-5x + $unit-half;
			height: $unit-3x;
			background-color: $gray-80;
			border-radius: $corner-radius-xl;
			transition: background-color 0.2s ease;
			flex-shrink: 0;

			&::before {
				content: '';
				position: absolute;
				top: $unit-2px;
				left: $unit-2px;
				width: $unit-20px;
				height: $unit-20px;
				background-color: white;
				border-radius: 50%;
				transition: transform 0.2s ease;
				box-shadow: 0 $unit-1px $unit-3px rgba(0, 0, 0, 0.1);
			}
		}

		.toggle-content {
			display: flex;
			flex-direction: column;
			gap: $unit-half;

			.toggle-title {
				font-weight: 500;
				color: $gray-10;
				font-size: 0.875rem;
			}

			.toggle-description {
				font-size: 0.75rem;
				color: $gray-50;
				line-height: 1.4;
			}
		}
	}

	.usage-section {
		.section-header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-bottom: $unit-2x;

			h4 {
				margin: 0;
				font-size: 1rem;
				font-weight: 600;
				color: $gray-20;
			}
		}

		.add-album-button {
			display: flex;
			align-items: center;
			gap: $unit-half;
			padding: $unit-half;
			background: transparent;
			border: none;
			border-radius: $corner-radius-sm;
			color: $gray-40;
			cursor: pointer;
			transition: all 0.2s ease;
			font-size: 0.875rem;
			font-weight: 500;

			&:hover {
				background: $gray-95;
				color: $gray-20;
			}

			svg,
			:global(svg) {
				width: $unit-2x;
				height: $unit-2x;
				flex-shrink: 0;
			}
		}
	}

	// Albums inline display
	.albums-inline {
		margin-top: $unit-4x;

		h4 {
			font-size: 1rem;
			font-weight: 600;
			color: $gray-20;
			margin: 0 0 $unit-2x 0;
		}
	}

	.album-tags {
		display: flex;
		flex-wrap: wrap;
		gap: $unit;
	}

	.album-tag {
		display: inline-flex;
		align-items: center;
		padding: $unit-half $unit-2x;
		background: $gray-95;
		border: $unit-1px solid $gray-90;
		border-radius: $unit-20px;
		color: $gray-20;
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.2s ease;

		&:hover {
			background: $gray-90;
			border-color: $gray-85;
			color: $gray-10;
		}
	}

	.pane-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: $unit-2x $unit-3x;
		border-top: $unit-1px solid rgba(0, 0, 0, 0.08);
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
