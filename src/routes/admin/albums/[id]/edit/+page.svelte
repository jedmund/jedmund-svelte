<script lang="ts">
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { onMount } from 'svelte'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import Button from '$lib/components/admin/Button.svelte'
	import Input from '$lib/components/admin/Input.svelte'
	import FormFieldWrapper from '$lib/components/admin/FormFieldWrapper.svelte'
	import LoadingSpinner from '$lib/components/admin/LoadingSpinner.svelte'
	import DeleteConfirmationModal from '$lib/components/admin/DeleteConfirmationModal.svelte'
	import MediaLibraryModal from '$lib/components/admin/MediaLibraryModal.svelte'
	import MediaDetailsModal from '$lib/components/admin/MediaDetailsModal.svelte'
	import GalleryUploader from '$lib/components/admin/GalleryUploader.svelte'
	import SaveActionsGroup from '$lib/components/admin/SaveActionsGroup.svelte'

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
	let isDeleteModalOpen = $state(false)

	// Photo management state
	let isMediaLibraryOpen = $state(false)
	let albumPhotos = $state<any[]>([])
	let isManagingPhotos = $state(false)
	let isUploading = $state(false)
	let uploadProgress = $state<Record<string, number>>({})
	let uploadErrors = $state<string[]>([])
	let fileInput: HTMLInputElement

	// Media details modal state
	let isMediaDetailsOpen = $state(false)
	let selectedMedia = $state<any>(null)

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

	async function handleSave(publishStatus?: 'draft' | 'published') {
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
				status: publishStatus || status
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

			if (publishStatus) {
				status = publishStatus
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
			const auth = localStorage.getItem('admin_auth')
			if (!auth) {
				goto('/admin/login')
				return
			}

			// Add photos to album via API
			for (const media of mediaArray) {
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
			error = err instanceof Error ? err.message : 'Failed to add photos'
			console.error('Failed to add photos:', err)
		} finally {
			isManagingPhotos = false
			isMediaLibraryOpen = false
		}
	}

	async function handleRemovePhoto(photoId: number) {
		if (!confirm('Are you sure you want to remove this photo from the album?')) {
			return
		}

		try {
			isManagingPhotos = true
			const auth = localStorage.getItem('admin_auth')
			if (!auth) {
				goto('/admin/login')
				return
			}

			const response = await fetch(`/api/photos/${photoId}`, {
				method: 'DELETE',
				headers: { Authorization: `Basic ${auth}` }
			})

			if (!response.ok) {
				throw new Error('Failed to remove photo from album')
			}

			// Remove from local state
			albumPhotos = albumPhotos.filter((photo) => photo.id !== photoId)

			// Update album photo count
			if (album._count) {
				album._count.photos = albumPhotos.length
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to remove photo'
			console.error('Failed to remove photo:', err)
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

	// Direct upload functions
	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement
		const files = Array.from(target.files || [])
		if (files.length > 0) {
			uploadFilesToAlbum(files)
		}
		// Reset input so same files can be selected again
		target.value = ''
	}

	async function uploadFilesToAlbum(files: File[]) {
		if (files.length === 0) return

		isUploading = true
		uploadErrors = []
		uploadProgress = {}

		const auth = localStorage.getItem('admin_auth')
		if (!auth) {
			goto('/admin/login')
			return
		}

		// Filter for image files
		const imageFiles = files.filter((file) => file.type.startsWith('image/'))

		if (imageFiles.length !== files.length) {
			uploadErrors = [
				...uploadErrors,
				`${files.length - imageFiles.length} non-image files were skipped`
			]
		}

		try {
			// Upload each file and add to album
			for (const file of imageFiles) {
				try {
					// First upload the file to media library
					const formData = new FormData()
					formData.append('file', file)

					// If this is a photography album, mark the uploaded media as photography
					if (isPhotography) {
						formData.append('isPhotography', 'true')
					}

					const uploadResponse = await fetch('/api/media/upload', {
						method: 'POST',
						headers: {
							Authorization: `Basic ${auth}`
						},
						body: formData
					})

					if (!uploadResponse.ok) {
						const error = await uploadResponse.json()
						uploadErrors = [...uploadErrors, `${file.name}: ${error.message || 'Upload failed'}`]
						continue
					}

					const media = await uploadResponse.json()
					uploadProgress = { ...uploadProgress, [file.name]: 50 }

					// Then add the uploaded media to the album
					const addResponse = await fetch(`/api/albums/${album.id}/photos`, {
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

					if (!addResponse.ok) {
						uploadErrors = [...uploadErrors, `${file.name}: Failed to add to album`]
						continue
					}

					const photo = await addResponse.json()
					albumPhotos = [...albumPhotos, photo]
					uploadProgress = { ...uploadProgress, [file.name]: 100 }
				} catch (err) {
					uploadErrors = [...uploadErrors, `${file.name}: Network error`]
				}
			}

			// Update album photo count
			if (album._count) {
				album._count.photos = albumPhotos.length
			}
		} finally {
			isUploading = false
			// Clear progress after a delay
			setTimeout(() => {
				uploadProgress = {}
				uploadErrors = []
			}, 3000)
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
				<Button
					variant="ghost"
					buttonSize="large"
					onclick={() => (isDeleteModalOpen = true)}
					disabled={isSaving}
				>
					<svg slot="icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
						<path
							d="M6 3V2C6 1.44772 6.44772 1 7 1H9C9.55228 1 10 1.44772 10 2V3M13 4H3M5 7V12M8 7V12M11 7V12M4 4L4.5 13C4.55228 13.5523 4.99772 14 5.5 14H10.5C11.0023 14 11.4477 13.5523 11.5 13L12 4H4Z"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
					Delete
				</Button>
				<SaveActionsGroup
					{status}
					onSave={handleSave}
					disabled={isSaving}
					isLoading={isSaving}
					{canSave}
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
					label="Slug"
					bind:value={slug}
					placeholder="album-url-slug"
					helpText="Used in the album URL."
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

				<div class="form-row">
					<Input
						type="date"
						label="Date"
						bind:value={date}
						helpText="When was this album created or photos taken?"
						disabled={isSaving}
					/>

					<Input
						label="Location"
						bind:value={location}
						placeholder="Location where photos were taken"
						disabled={isSaving}
					/>
				</div>
			</div>

			<div class="form-section">
				<h2>Album Settings</h2>

				<!-- Photography Toggle -->
				<FormFieldWrapper label="Album Type">
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
								<span class="toggle-title">Photography Album</span>
								<span class="toggle-description">Show this album in the photography experience</span
								>
							</div>
						</label>
					</div>
				</FormFieldWrapper>

				<!-- Show in Universe Toggle -->
				<FormFieldWrapper label="Visibility">
					<div class="universe-toggle">
						<label class="toggle-label">
							<input
								type="checkbox"
								bind:checked={showInUniverse}
								disabled={isSaving}
								class="toggle-input"
							/>
							<span class="toggle-slider"></span>
							<div class="toggle-content">
								<span class="toggle-title">Show in Universe</span>
								<span class="toggle-description">Display this album in the Universe feed</span>
							</div>
						</label>
					</div>
				</FormFieldWrapper>
			</div>

			<!-- Photo Management -->
			<div class="form-section">
				<div class="section-header">
					<h2>Photos ({albumPhotos.length})</h2>
					<div class="photo-actions">
						<Button
							variant="secondary"
							onclick={() => fileInput.click()}
							disabled={isManagingPhotos || isUploading}
						>
							<svg
								slot="icon"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15M17 8L12 3M12 3L7 8M12 3V15"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
							{isUploading ? 'Uploading...' : 'Upload from Computer'}
						</Button>
						<Button
							variant="secondary"
							onclick={() => (isMediaLibraryOpen = true)}
							disabled={isManagingPhotos || isUploading}
						>
							<svg
								slot="icon"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									d="M21 21L15 15L21 21ZM3 9C3 8.17157 3.67157 7.5 4.5 7.5H19.5C20.3284 7.5 21 8.17157 21 9V18C21 18.8284 20.3284 19.5 19.5 19.5H4.5C3.67157 19.5 3 18.8284 3 18V9Z"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
								<path
									d="M9 13.5L12 10.5L15 13.5"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
							Add from Library
						</Button>
					</div>
				</div>

				<GalleryUploader
					label="Album Photos"
					bind:value={albumPhotos}
					onUpload={handleAddPhotosFromUpload}
					onReorder={handlePhotoReorder}
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

<!-- Delete Confirmation Modal -->
<DeleteConfirmationModal
	bind:isOpen={isDeleteModalOpen}
	title="Delete Album"
	message="Are you sure you want to delete this album? This action cannot be undone."
	confirmText="Delete Album"
	onConfirm={handleDelete}
	onCancel={() => (isDeleteModalOpen = false)}
/>

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
			border-bottom: 1px solid $grey-85;
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

	// Photo actions styles
	.photo-actions {
		display: flex;
		gap: $unit-2x;
	}

	.empty-actions {
		display: flex;
		gap: $unit-2x;
		justify-content: center;
		margin-top: $unit-3x;
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
