<script lang="ts">
	import { goto } from '$app/navigation'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import Button from '$lib/components/admin/Button.svelte'
	import Input from '$lib/components/admin/Input.svelte'
	import FormFieldWrapper from '$lib/components/admin/FormFieldWrapper.svelte'
	import MediaLibraryModal from '$lib/components/admin/MediaLibraryModal.svelte'
	import MediaDetailsModal from '$lib/components/admin/MediaDetailsModal.svelte'
	import GalleryUploader from '$lib/components/admin/GalleryUploader.svelte'
	import SaveActionsGroup from '$lib/components/admin/SaveActionsGroup.svelte'
	import AlbumMetadataPopover from '$lib/components/admin/AlbumMetadataPopover.svelte'

	// Form state
	let title = $state('')
	let slug = $state('')
	let description = $state('')
	let date = $state('')
	let location = $state('')
	let isPhotography = $state(false)
	let showInUniverse = $state(false)
	let status = $state<'draft' | 'published'>('draft')

	// UI state
	let isSaving = $state(false)
	let error = $state('')

	// Photo management state
	let isMediaLibraryOpen = $state(false)
	let albumPhotos = $state<any[]>([])
	let isManagingPhotos = $state(false)

	// Media details modal state
	let isMediaDetailsOpen = $state(false)
	let selectedMedia = $state<any>(null)

	// Metadata popover state
	let isMetadataOpen = $state(false)
	let metadataButtonElement: HTMLButtonElement

	// Auto-generate slug from title
	$effect(() => {
		if (title && !slug) {
			slug = generateSlug(title)
		}
	})

	function generateSlug(text: string): string {
		return text
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
	}

	async function handleSave(publishStatus: 'draft' | 'published') {
		if (!title.trim()) {
			error = 'Title is required'
			return
		}

		if (!slug.trim()) {
			error = 'Slug is required'
			return
		}

		try {
			isSaving = true
			error = ''

			const auth = localStorage.getItem('admin_auth')
			if (!auth) {
				goto('/admin/login')
				return
			}

			const albumData = {
				title: title.trim(),
				slug: slug.trim(),
				description: description.trim() || null,
				date: date ? new Date(date).toISOString() : null,
				location: location.trim() || null,
				isPhotography,
				showInUniverse,
				status: publishStatus
			}

			const response = await fetch('/api/albums', {
				method: 'POST',
				headers: {
					Authorization: `Basic ${auth}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(albumData)
			})

			if (!response.ok) {
				const errorData = await response.json()
				throw new Error(errorData.message || 'Failed to create album')
			}

			const album = await response.json()

			// Redirect to album edit page or albums list
			goto(`/admin/albums/${album.id}/edit`)
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create album'
			console.error('Failed to create album:', err)
		} finally {
			isSaving = false
		}
	}

	function handleCancel() {
		goto('/admin/albums')
	}

	// Photo management functions (simplified for new album - no API calls yet)
	function handleMediaLibraryClose() {
		isMediaLibraryOpen = false
	}

	function handlePhotoClick(photo: any) {
		// Convert album photo to media format for MediaDetailsModal
		selectedMedia = {
			id: photo.mediaId || photo.id,
			filename: photo.filename,
			originalName: photo.filename,
			mimeType: photo.mimeType || 'image/jpeg',
			size: photo.size || 0,
			url: photo.url,
			thumbnailUrl: photo.thumbnailUrl,
			width: photo.width,
			height: photo.height,
			altText: photo.altText || '',
			description: photo.description || '',
			isPhotography: photo.isPhotography || false,
			createdAt: photo.createdAt,
			updatedAt: photo.updatedAt
		}
		isMediaDetailsOpen = true
	}

	function handleMediaDetailsClose() {
		isMediaDetailsOpen = false
		selectedMedia = null
	}

	function handleMediaUpdate(updatedMedia: any) {
		// Update the photo in the album photos list
		const photoIndex = albumPhotos.findIndex(
			(photo) => (photo.mediaId || photo.id) === updatedMedia.id
		)
		if (photoIndex !== -1) {
			albumPhotos[photoIndex] = {
				...albumPhotos[photoIndex],
				filename: updatedMedia.filename,
				altText: updatedMedia.altText,
				description: updatedMedia.description,
				isPhotography: updatedMedia.isPhotography
			}
			albumPhotos = [...albumPhotos] // Trigger reactivity
		}
		selectedMedia = updatedMedia
	}

	function handlePhotoReorder(reorderedPhotos: any[]) {
		albumPhotos = reorderedPhotos
	}

	function handleGalleryAdd(newPhotos: any[]) {
		if (newPhotos.length > 0) {
			albumPhotos = [...albumPhotos, ...newPhotos]
		}
	}

	function handleGalleryRemove(itemToRemove: any, index: number) {
		albumPhotos = albumPhotos.filter((_, i) => i !== index)
	}

	// Metadata popover handlers
	function handleMetadataUpdate(key: string, value: any) {
		if (key === 'date') {
			date = value ? new Date(value).toISOString().split('T')[0] : ''
		} else {
			// Update the form state variable
			switch (key) {
				case 'slug':
					slug = value
					break
				case 'location':
					location = value
					break
				case 'isPhotography':
					isPhotography = value
					break
				case 'showInUniverse':
					showInUniverse = value
					break
			}
		}
	}

	// Mock album object for metadata popover
	const mockAlbum = $derived({
		id: null,
		title,
		slug,
		description,
		date: date ? new Date(date).toISOString() : null,
		location,
		isPhotography,
		showInUniverse,
		status,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString()
	})

	const canSave = $derived(title.trim().length > 0 && slug.trim().length > 0)
</script>

<AdminPage>
	<header slot="header">
		<div class="header-left">
			<button class="btn-icon" onclick={handleCancel}>
				<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
					<path
						d="M12.5 15L7.5 10L12.5 5"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</button>
		</div>
		<div class="header-actions">
			<div class="metadata-popover-container">
				<button
					bind:this={metadataButtonElement}
					class="btn btn-text"
					onclick={(e) => {
						e.stopPropagation()
						isMetadataOpen = !isMetadataOpen
					}}
					disabled={isSaving}
				>
					<svg width="16" height="16" viewBox="0 0 56 56" fill="none">
						<path
							fill="currentColor"
							d="M 36.4023 19.3164 C 38.8398 19.3164 40.9257 17.7461 41.6992 15.5898 L 49.8085 15.5898 C 50.7695 15.5898 51.6133 14.7461 51.6133 13.6914 C 51.6133 12.6367 50.7695 11.8164 49.8085 11.8164 L 41.7226 11.8164 C 40.9257 9.6367 38.8398 8.0430 36.4023 8.0430 C 33.9648 8.0430 31.8789 9.6367 31.1054 11.8164 L 6.2851 11.8164 C 5.2304 11.8164 4.3867 12.6367 4.3867 13.6914 C 4.3867 14.7461 5.2304 15.5898 6.2851 15.5898 L 31.1054 15.5898 C 31.8789 17.7461 33.9648 19.3164 36.4023 19.3164 Z M 6.1913 26.1133 C 5.2304 26.1133 4.3867 26.9570 4.3867 28.0117 C 4.3867 29.0664 5.2304 29.8867 6.1913 29.8867 L 14.5586 29.8867 C 15.3320 32.0898 17.4179 33.6601 19.8554 33.6601 C 22.3164 33.6601 24.4023 32.0898 25.1757 29.8867 L 49.7149 29.8867 C 50.7695 29.8867 51.6133 29.0664 51.6133 28.0117 C 51.6133 26.9570 50.7695 26.1133 49.7149 26.1133 L 25.1757 26.1133 C 24.3789 23.9570 22.2929 22.3867 19.8554 22.3867 C 17.4413 22.3867 15.3554 23.9570 14.5586 26.1133 Z M 36.4023 47.9570 C 38.8398 47.9570 40.9257 46.3867 41.6992 44.2070 L 49.8085 44.2070 C 50.7695 44.2070 51.6133 43.3867 51.6133 42.3320 C 51.6133 41.2773 50.7695 40.4336 49.8085 40.4336 L 41.6992 40.4336 C 40.9257 38.2539 38.8398 36.7070 36.4023 36.7070 C 33.9648 36.7070 31.8789 38.2539 31.1054 40.4336 L 6.2851 40.4336 C 5.2304 40.4336 4.3867 41.2773 4.3867 42.3320 C 4.3867 43.3867 5.2304 44.2070 6.2851 44.2070 L 31.1054 44.2070 C 31.8789 46.3867 33.9648 47.9570 36.4023 47.9570 Z"
						/>
					</svg>
					Metadata
				</button>

				{#if isMetadataOpen && metadataButtonElement}
					<AlbumMetadataPopover
						album={mockAlbum}
						triggerElement={metadataButtonElement}
						onUpdate={handleMetadataUpdate}
						onDelete={() => {}}
						onClose={() => (isMetadataOpen = false)}
					/>
				{/if}
			</div>
			<SaveActionsGroup
				{status}
				onSave={handleSave}
				disabled={isSaving}
				isLoading={isSaving}
				{canSave}
			/>
		</div>
	</header>

	<div class="album-form">
		{#if error}
			<div class="error-message">{error}</div>
		{/if}

		<div class="form-section">
			<h2>Album Details</h2>

			<Input
				label="Title"
				bind:value={title}
				placeholder="Enter album title"
				required
				disabled={isSaving}
				fullWidth
			/>

			<Input
				type="textarea"
				label="Description"
				bind:value={description}
				placeholder="Describe this album..."
				rows={3}
				disabled={isSaving}
				fullWidth
			/>
		</div>

		<!-- Photo Management -->
		<div class="form-section">
			<h2>Photos ({albumPhotos.length})</h2>

			<GalleryUploader
				label="Album Photos"
				bind:value={albumPhotos}
				onUpload={handleGalleryAdd}
				onReorder={handlePhotoReorder}
				onRemove={handleGalleryRemove}
				showBrowseLibrary={true}
				placeholder="Add photos to this album by uploading or selecting from your media library"
				helpText="Drag photos to reorder them. Click on photos to edit metadata."
			/>
		</div>
	</div>
</AdminPage>

<!-- Media Library Modal -->
<MediaLibraryModal
	bind:isOpen={isMediaLibraryOpen}
	mode="multiple"
	fileType="image"
	onSelect={handleGalleryAdd}
	onClose={handleMediaLibraryClose}
/>

<!-- Media Details Modal -->
<MediaDetailsModal
	bind:isOpen={isMediaDetailsOpen}
	media={selectedMedia}
	onClose={handleMediaDetailsClose}
	onUpdate={handleMediaUpdate}
/>

<style lang="scss">
	@import '$styles/variables.scss';

	.header-left {
		display: flex;
		align-items: center;
		gap: $unit-2x;

		h1 {
			font-size: 1.5rem;
			font-weight: 700;
			margin: 0;
			color: $grey-10;
		}
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: $unit-2x;
	}

	.btn-icon {
		width: 40px;
		height: 40px;
		border: none;
		background: none;
		color: $grey-40;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		transition: all 0.2s ease;

		&:hover {
			background: $grey-90;
			color: $grey-10;
		}
	}

	.btn-text {
		padding: $unit $unit-2x;
		border: none;
		background: none;
		color: $grey-40;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: $unit;
		border-radius: 8px;
		font-size: 0.875rem;
		transition: all 0.2s ease;

		&:hover {
			background: $grey-90;
			color: $grey-10;
		}
	}

	.btn {
		padding: $unit-2x $unit-3x;
		border: none;
		border-radius: 50px;
		font-size: 0.925rem;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		gap: $unit;

		&:disabled {
			opacity: 0.6;
			cursor: not-allowed;
		}
	}

	.metadata-popover-container {
		position: relative;
	}

	.album-form {
		max-width: 800px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: $unit-6x;
	}

	.error-message {
		background: rgba(239, 68, 68, 0.1);
		color: #dc2626;
		padding: $unit-3x;
		border-radius: $unit-2x;
		border: 1px solid rgba(239, 68, 68, 0.2);
	}

	.form-section {
		display: flex;
		flex-direction: column;
		gap: $unit-4x;

		h2 {
			font-size: 1.25rem;
			font-weight: 600;
			margin: 0;
			color: $grey-10;
			padding-bottom: $unit-2x;
		}
	}
</style>
