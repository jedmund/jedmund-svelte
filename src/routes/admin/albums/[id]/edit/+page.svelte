<script lang="ts">
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { onMount } from 'svelte'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import Button from '$lib/components/admin/Button.svelte'
	import Input from '$lib/components/admin/Input.svelte'
	import FormFieldWrapper from '$lib/components/admin/FormFieldWrapper.svelte'
	import LoadingSpinner from '$lib/components/admin/LoadingSpinner.svelte'
	import MediaLibraryModal from '$lib/components/admin/MediaLibraryModal.svelte'
	import MediaDetailsModal from '$lib/components/admin/MediaDetailsModal.svelte'
	import GalleryUploader from '$lib/components/admin/GalleryUploader.svelte'
	import StatusDropdown from '$lib/components/admin/StatusDropdown.svelte'
	import AlbumMetadataPopover from '$lib/components/admin/AlbumMetadataPopover.svelte'

	// Form state
	let album = $state<any>(null)
	let title = $state('')
	let slug = $state('')
	let description = $state('')
	let date = $state('')
	let location = $state('')
	let isPhotography = $state(false)
	let showInUniverse = $state(false)
	let status = $state<'draft' | 'published'>('draft')

	// UI state
	let isLoading = $state(true)
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

	onMount(async () => {
		await loadAlbum()
	})

	async function loadAlbum() {
		try {
			isLoading = true
			const auth = localStorage.getItem('admin_auth')
			if (!auth) {
				goto('/admin/login')
				return
			}

			const response = await fetch(`/api/albums/${$page.params.id}`, {
				headers: { Authorization: `Basic ${auth}` }
			})

			if (!response.ok) {
				if (response.status === 404) {
					error = 'Album not found'
					return
				}
				if (response.status === 401) {
					goto('/admin/login')
					return
				}
				throw new Error('Failed to load album')
			}

			album = await response.json()

			// Populate form fields
			title = album.title || ''
			slug = album.slug || ''
			description = album.description || ''
			date = album.date ? new Date(album.date).toISOString().split('T')[0] : ''
			location = album.location || ''
			isPhotography = album.isPhotography || false
			showInUniverse = album.showInUniverse || false
			status = album.status || 'draft'

			// Populate photos
			albumPhotos = album.photos || []
		} catch (err) {
			error = 'Failed to load album'
			console.error('Failed to load album:', err)
		} finally {
			isLoading = false
		}
	}

	async function handleSave(newStatus?: string) {
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
				status: newStatus || status
			}

			const response = await fetch(`/api/albums/${album.id}`, {
				method: 'PUT',
				headers: {
					Authorization: `Basic ${auth}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(albumData)
			})

			if (!response.ok) {
				const errorData = await response.json()
				throw new Error(errorData.message || 'Failed to update album')
			}

			const updatedAlbum = await response.json()
			album = updatedAlbum

			if (newStatus) {
				status = newStatus
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to update album'
			console.error('Failed to update album:', err)
		} finally {
			isSaving = false
		}
	}

	async function handleDelete() {
		try {
			const auth = localStorage.getItem('admin_auth')
			if (!auth) {
				goto('/admin/login')
				return
			}

			const response = await fetch(`/api/albums/${album.id}`, {
				method: 'DELETE',
				headers: { Authorization: `Basic ${auth}` }
			})

			if (!response.ok) {
				const errorData = await response.json()
				throw new Error(errorData.message || 'Failed to delete album')
			}

			goto('/admin/albums')
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to delete album'
			console.error('Failed to delete album:', err)
		}
	}

	function handleCancel() {
		goto('/admin/albums')
	}

	// Photo management functions
	async function handleAddPhotos(selectedMedia: any | any[]) {
		const mediaArray = Array.isArray(selectedMedia) ? selectedMedia : [selectedMedia]

		try {
			isManagingPhotos = true
			error = '' // Clear any previous errors

			const auth = localStorage.getItem('admin_auth')
			if (!auth) {
				goto('/admin/login')
				return
			}

			// Check for duplicates before adding
			const existingMediaIds = albumPhotos.map((p) => p.mediaId).filter(Boolean)
			const newMedia = mediaArray.filter((media) => !existingMediaIds.includes(media.id))

			if (newMedia.length === 0) {
				error = 'All selected photos are already in this album'
				return
			}

			if (newMedia.length < mediaArray.length) {
				console.log(
					`Skipping ${mediaArray.length - newMedia.length} photos that are already in the album`
				)
			}

			// Add photos to album via API
			const addedPhotos = []
			console.log(
				'Adding photos to album:',
				newMedia.map((m) => ({ id: m.id, filename: m.filename }))
			)

			for (const media of newMedia) {
				console.log(`Adding photo ${media.id} (${media.filename}) to album ${album.id}`)

				const response = await fetch(`/api/albums/${album.id}/photos`, {
					method: 'POST',
					headers: {
						Authorization: `Basic ${auth}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						mediaId: media.id,
						displayOrder: albumPhotos.length + addedPhotos.length
					})
				})

				console.log(`API response for media ${media.id}:`, response.status, response.statusText)

				if (!response.ok) {
					const errorData = await response.text()
					console.error(`Failed to add photo ${media.filename}:`, response.status, errorData)
					throw new Error(`Failed to add photo ${media.filename}: ${response.status} ${errorData}`)
				}

				const photo = await response.json()
				console.log('Photo added successfully:', photo)
				addedPhotos.push(photo)
			}

			console.log('All photos added, updating local state. Added photos:', addedPhotos)
			// Update local state with all added photos
			albumPhotos = [...albumPhotos, ...addedPhotos]
			console.log('Updated albumPhotos array:', albumPhotos.length, 'photos')

			// Update album photo count
			if (album._count) {
				album._count.photos = albumPhotos.length
			}

			console.log(`Successfully added ${addedPhotos.length} photos to album`)
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to add photos'
			console.error('Failed to add photos:', err)
		} finally {
			isManagingPhotos = false
			isMediaLibraryOpen = false
		}
	}

	async function handleRemovePhoto(photoId: number, skipConfirmation = false) {
		const photoToRemove = albumPhotos.find((p) => p.id === photoId)
		if (!photoToRemove) {
			error = 'Photo not found in album'
			return false
		}

		if (
			!skipConfirmation &&
			!confirm(
				`Remove "${photoToRemove.filename || 'this photo'}" from this album?\n\nNote: This will only remove it from the album. The original photo will remain in your media library.`
			)
		) {
			return false
		}

		try {
			isManagingPhotos = true
			error = '' // Clear any previous errors

			const auth = localStorage.getItem('admin_auth')
			if (!auth) {
				goto('/admin/login')
				return false
			}

			console.log(`Attempting to remove photo with ID: ${photoId} from album ${album.id}`)
			console.log('Photo to remove:', photoToRemove)

			const response = await fetch(`/api/albums/${album.id}/photos?photoId=${photoId}`, {
				method: 'DELETE',
				headers: { Authorization: `Basic ${auth}` }
			})

			console.log(`DELETE response status: ${response.status}`)

			if (!response.ok) {
				const errorData = await response.text()
				console.error(`Delete failed: ${response.status} ${errorData}`)
				throw new Error(`Failed to remove photo: ${response.status} ${errorData}`)
			}

			// Remove from local state only after successful API call
			albumPhotos = albumPhotos.filter((photo) => photo.id !== photoId)

			// Update album photo count
			if (album._count) {
				album._count.photos = albumPhotos.length
			}

			console.log(`Successfully removed photo ${photoId} from album`)
			return true
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to remove photo from album'
			console.error('Failed to remove photo:', err)
			return false
		} finally {
			isManagingPhotos = false
		}
	}

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
			// Update the photo with new media information
			albumPhotos[photoIndex] = {
				...albumPhotos[photoIndex],
				filename: updatedMedia.filename,
				altText: updatedMedia.altText,
				description: updatedMedia.description,
				isPhotography: updatedMedia.isPhotography
			}
			albumPhotos = [...albumPhotos] // Trigger reactivity
		}

		// Update selectedMedia for the modal
		selectedMedia = updatedMedia
	}

	async function handlePhotoReorder(reorderedPhotos: any[]) {
		try {
			const auth = localStorage.getItem('admin_auth')
			if (!auth) {
				goto('/admin/login')
				return
			}

			// Update display order for each photo
			const updatePromises = reorderedPhotos.map((photo, index) =>
				fetch(`/api/albums/${album.id}/photos`, {
					method: 'PUT',
					headers: {
						Authorization: `Basic ${auth}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						photoId: photo.id,
						displayOrder: index
					})
				})
			)

			await Promise.all(updatePromises)

			// Update local state
			albumPhotos = reorderedPhotos
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to reorder photos'
			console.error('Failed to reorder photos:', err)
		}
	}

	async function handleAddPhotosFromUpload(uploadedMedia: any[]) {
		try {
			isManagingPhotos = true
			const auth = localStorage.getItem('admin_auth')
			if (!auth) {
				goto('/admin/login')
				return
			}

			// Add each uploaded media item to the album
			for (const media of uploadedMedia) {
				const response = await fetch(`/api/albums/${album.id}/photos`, {
					method: 'POST',
					headers: {
						Authorization: `Basic ${auth}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						mediaId: media.id,
						displayOrder: albumPhotos.length
					})
				})

				if (!response.ok) {
					throw new Error(`Failed to add photo ${media.filename}`)
				}

				const photo = await response.json()
				albumPhotos = [...albumPhotos, photo]
			}

			// Update album photo count
			if (album._count) {
				album._count.photos = albumPhotos.length
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to add photos to album'
			console.error('Failed to add photos to album:', err)
		} finally {
			isManagingPhotos = false
		}
	}

	// Handle new photos added through GalleryUploader (uploads or library selections)
	async function handleGalleryAdd(newPhotos: any[]) {
		try {
			if (newPhotos.length > 0) {
				// Check if these are new uploads (have File objects) or library selections (have media IDs)
				const uploadsToAdd = newPhotos.filter((photo) => photo instanceof File || !photo.id)
				const libraryPhotosToAdd = newPhotos.filter((photo) => photo.id && !(photo instanceof File))

				// Handle new uploads
				if (uploadsToAdd.length > 0) {
					await handleAddPhotosFromUpload(uploadsToAdd)
				}

				// Handle library selections
				if (libraryPhotosToAdd.length > 0) {
					await handleAddPhotos(libraryPhotosToAdd)
				}
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to add photos'
			console.error('Failed to add photos:', err)
		}
	}

	// Handle photo removal from GalleryUploader
	async function handleGalleryRemove(itemToRemove: any, index: number) {
		try {
			// Find the photo ID to remove
			const photoId = itemToRemove.id
			if (!photoId) {
				error = 'Cannot remove photo: no photo ID found'
				return
			}

			// Call the existing remove photo function
			const success = await handleRemovePhoto(photoId, true) // Skip confirmation since user clicked remove
			if (!success) {
				// If removal failed, we need to reset the gallery state
				// Force a reactivity update
				albumPhotos = [...albumPhotos]
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to remove photo'
			console.error('Failed to remove photo:', err)
			// Reset gallery state on error
			albumPhotos = [...albumPhotos]
		}
	}

	function generateSlug(text: string): string {
		return text
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
	}

	// Auto-update slug when title changes (only if slug is empty)
	$effect(() => {
		if (title && !slug) {
			slug = generateSlug(title)
		}
	})

	const canSave = $derived(title.trim().length > 0 && slug.trim().length > 0)

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

	function handleMetadataDelete() {
		isMetadataOpen = false
		handleDelete()
	}
</script>

<AdminPage>
	<header slot="header">
		{#if !isLoading && album}
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

					{#if isMetadataOpen && metadataButtonElement && album}
						<AlbumMetadataPopover
							bind:album
							triggerElement={metadataButtonElement}
							onUpdate={handleMetadataUpdate}
							onDelete={handleMetadataDelete}
							onClose={() => (isMetadataOpen = false)}
						/>
					{/if}
				</div>
				<StatusDropdown
					currentStatus={status}
					onStatusChange={handleSave}
					disabled={isSaving}
					isLoading={isSaving}
					primaryAction={status === 'published'
						? { label: 'Save', status: 'published' }
						: { label: 'Publish', status: 'published' }}
					dropdownActions={[{ label: 'Save as Draft', status: 'draft', show: status !== 'draft' }]}
					viewUrl={slug ? `/photos/${slug}` : undefined}
				/>
			</div>
		{/if}
	</header>

	{#if isLoading}
		<div class="loading-container">
			<LoadingSpinner />
		</div>
	{:else if error && !album}
		<div class="error-container">
			<div class="error-message">{error}</div>
			<Button variant="secondary" onclick={handleCancel}>Back to Albums</Button>
		</div>
	{:else if album}
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

			<!-- Album Stats -->
			<div class="form-section">
				<h2>Album Statistics</h2>
				<div class="album-stats">
					<div class="stat">
						<span class="stat-value">{album._count?.photos || 0}</span>
						<span class="stat-label">Photos</span>
					</div>
					<div class="stat">
						<span class="stat-value">{status === 'published' ? 'Published' : 'Draft'}</span>
						<span class="stat-label">Status</span>
					</div>
					<div class="stat">
						<span class="stat-value">{new Date(album.createdAt).toLocaleDateString()}</span>
						<span class="stat-label">Created</span>
					</div>
				</div>
			</div>
		</div>
	{/if}
</AdminPage>

<!-- Media Library Modal -->
<MediaLibraryModal
	bind:isOpen={isMediaLibraryOpen}
	mode="multiple"
	fileType="image"
	onSelect={handleAddPhotos}
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

		&.metadata-btn {
			&:hover {
				background: $blue-60;
				color: white;
			}
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


	.loading-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 400px;
	}

	.error-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: $unit-4x;
		padding: $unit-6x;
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

		.section-header {
			display: flex;
			align-items: center;
			justify-content: space-between;

			h2 {
				border-bottom: none;
				padding-bottom: 0;
				margin-bottom: 0;
			}
		}
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: $unit-3x;

		@include breakpoint('tablet') {
			grid-template-columns: 1fr;
		}
	}

	.photography-toggle,
	.universe-toggle {
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

	// Photo management styles
	.empty-photos {
		text-align: center;
		padding: $unit-6x $unit-4x;
		background: $grey-97;
		border-radius: $unit-2x;
		border: 2px dashed $grey-85;

		.empty-icon {
			font-size: 3rem;
			margin-bottom: $unit-2x;
		}

		h3 {
			font-size: 1.125rem;
			font-weight: 600;
			margin: 0 0 $unit;
			color: $grey-20;
		}

		p {
			margin: 0 0 $unit-3x;
			color: $grey-50;
		}
	}

	.photos-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: $unit-3x;
	}

	.photo-item {
		display: flex;
		flex-direction: column;
		gap: $unit;
		background: white;
		border-radius: $unit-2x;
		overflow: hidden;
		border: 1px solid $grey-90;
		transition: all 0.2s ease;

		&:hover {
			border-color: $grey-70;
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

			.remove-photo-btn {
				opacity: 1;
			}
		}
	}

	.photo-preview {
		display: grid;
		grid-template-columns: 1fr;
		grid-template-rows: 1fr;
		aspect-ratio: 1;
		overflow: hidden;

		// Both elements occupy the same grid cell
		.photo-click-area,
		.remove-photo-btn {
			grid-column: 1;
			grid-row: 1;
		}

		.photo-click-area {
			width: 100%;
			height: 100%;
			border: none;
			padding: 0;
			background: none;
			cursor: pointer;
			display: block;
			z-index: 1;

			&:disabled {
				cursor: not-allowed;
			}

			img {
				width: 100%;
				height: 100%;
				object-fit: cover;
				display: block;
			}
		}

		.remove-photo-btn {
			justify-self: end;
			align-self: start;
			margin: $unit;
			z-index: 2;
			background: rgba(255, 255, 255, 0.9);
			border: none;
			border-radius: 50%;
			width: 24px;
			height: 24px;
			display: flex;
			align-items: center;
			justify-content: center;
			cursor: pointer;
			color: #dc2626;
			transition: all 0.2s ease;
			opacity: 0;
			box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

			&:hover {
				background: #dc2626;
				color: white;
				transform: scale(1.1);
			}

			&:disabled {
				opacity: 0.3;
				cursor: not-allowed;
			}

			svg {
				width: 12px;
				height: 12px;
			}
		}
	}

	.photo-info {
		padding: $unit-2x;
		display: flex;
		flex-direction: column;
		gap: $unit-half;

		.photo-filename {
			font-size: 0.75rem;
			color: $grey-20;
			font-weight: 500;
			word-break: break-all;
		}

		.photo-caption {
			font-size: 0.75rem;
			color: $grey-50;
			font-style: italic;
		}
	}

	.album-stats {
		display: flex;
		gap: $unit-6x;
		padding: $unit-4x;
		background: $grey-95;
		border-radius: $unit-2x;

		.stat {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: $unit-half;

			.stat-value {
				font-size: 1.5rem;
				font-weight: 600;
				color: $grey-10;
			}

			.stat-label {
				font-size: 0.875rem;
				color: $grey-40;
			}
		}
	}

	// Upload status styles
	.upload-status {
		background: white;
		border: 1px solid $grey-85;
		border-radius: $unit-2x;
		padding: $unit-3x;
		margin-top: $unit-3x;

		h4 {
			margin: 0 0 $unit-2x 0;
			color: $grey-20;
			font-size: 0.925rem;
			font-weight: 600;
		}
	}

	.upload-progress {
		margin-bottom: $unit-3x;

		.progress-item {
			display: flex;
			align-items: center;
			gap: $unit-2x;
			margin-bottom: $unit-2x;

			&:last-child {
				margin-bottom: 0;
			}
		}

		.progress-filename {
			flex: 1;
			font-size: 0.875rem;
			color: $grey-30;
			font-weight: 500;
			min-width: 0;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.progress-bar {
			flex: 2;
			height: 8px;
			background: $grey-90;
			border-radius: 4px;
			overflow: hidden;

			.progress-fill {
				height: 100%;
				background: #3b82f6;
				transition: width 0.3s ease;
				border-radius: 4px;
			}
		}

		.progress-percentage {
			font-size: 0.75rem;
			color: $grey-40;
			font-weight: 500;
			width: 40px;
			text-align: right;
		}
	}

	.upload-errors {
		.error-item {
			color: #dc2626;
			font-size: 0.875rem;
			margin-bottom: $unit;
			padding: $unit;
			background: rgba(239, 68, 68, 0.05);
			border-radius: $unit;
			border: 1px solid rgba(239, 68, 68, 0.1);

			&:last-child {
				margin-bottom: 0;
			}
		}
	}
</style>
