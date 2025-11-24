<script lang="ts">
	import { goto } from '$app/navigation'
	import { z } from 'zod'
	import AdminPage from './AdminPage.svelte'
	import AdminSegmentedControl from './AdminSegmentedControl.svelte'
	import Input from './Input.svelte'
	import Button from './Button.svelte'
	import DropdownSelectField from './DropdownSelectField.svelte'
	import AutoSaveStatus from './AutoSaveStatus.svelte'
	import UnifiedMediaModal from './UnifiedMediaModal.svelte'
	import SmartImage from '../SmartImage.svelte'
	import Composer from './composer'
	import { toast } from '$lib/stores/toast'
	import type { Album, Media } from '@prisma/client'
	import type { JSONContent } from '@tiptap/core'

	interface Props {
		album?: Album | null
		mode: 'create' | 'edit'
	}

	let { album = null, mode }: Props = $props()

	// Album schema for validation
	const albumSchema = z.object({
		title: z.string().min(1, 'Title is required'),
		slug: z
			.string()
			.min(1, 'Slug is required')
			.regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
		location: z.string().optional(),
		year: z.string().optional()
	})

	// State
	let isLoading = $state(mode === 'edit')
	let isSaving = $state(false)
	let validationErrors = $state<Record<string, string>>({})
	let showBulkAlbumModal = $state(false)
	let albumMedia = $state<Array<{ media: Media; displayOrder: number }>>([])
	let editorInstance = $state<{ save: () => Promise<JSONContent>; clear: () => void } | undefined>()
	let activeTab = $state('metadata')
	let pendingMediaIds = $state<number[]>([]) // Photos to add after album creation

	const tabOptions = [
		{ value: 'metadata', label: 'Metadata' },
		{ value: 'content', label: 'Content' }
	]

	const statusOptions = [
		{
			value: 'draft',
			label: 'Draft',
			description: 'Only visible to you'
		},
		{
			value: 'published',
			label: 'Published',
			description: 'Visible on your public site'
		}
	]

	// Form data
	let formData = $state({
		title: '',
		slug: '',
		year: '',
		location: '',
		showInUniverse: false,
		status: 'draft' as 'draft' | 'published',
		content: { type: 'doc', content: [{ type: 'paragraph' }] } as JSONContent
	})

	// Derived state for existing media IDs
	const existingMediaIds = $derived(albumMedia.map((item) => item.media.id))

	// Watch for album changes and populate form data
	$effect(() => {
		if (album && mode === 'edit') {
			populateFormData(album)
			loadAlbumMedia()
		} else if (mode === 'create') {
			isLoading = false
		}
	})

	// Watch for title changes and update slug
	$effect(() => {
		if (formData.title && mode === 'create') {
			formData.slug = formData.title
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-+|-+$/g, '')
		}
	})

	function populateFormData(data: Album) {
		formData = {
			title: data.title || '',
			slug: data.slug || '',
			year: data.date ? new Date(data.date).getFullYear().toString() : '',
			location: data.location || '',
			showInUniverse: data.showInUniverse || false,
			status: (data.status as 'draft' | 'published') || 'draft',
			content: (data.content as JSONContent) || { type: 'doc', content: [{ type: 'paragraph' }] }
		}

		isLoading = false
	}

	async function loadAlbumMedia() {
		if (!album) return

		try {
		const response = await fetch(`/api/albums/${album.id}`, {
			credentials: 'same-origin'
		})
			if (response.ok) {
				const data = await response.json()
				albumMedia = data.media || []
			}
		} catch (err) {
			console.error('Failed to load album media:', err)
		}
	}

	function validateForm() {
		try {
			albumSchema.parse({
				title: formData.title,
				slug: formData.slug,
				location: formData.location || undefined,
				year: formData.year || undefined
			})
			validationErrors = {}
			return true
		} catch (err) {
			if (err instanceof z.ZodError) {
				const errors: Record<string, string> = {}
				err.errors.forEach((e) => {
					if (e.path[0]) {
						errors[e.path[0].toString()] = e.message
					}
				})
				validationErrors = errors
			}
			return false
		}
	}

	async function handleSave() {
		if (!validateForm()) {
			toast.error('Please fix the validation errors')
			return
		}

		const loadingToastId = toast.loading(`${mode === 'edit' ? 'Saving' : 'Creating'} album...`)

		try {
			isSaving = true

			const payload = {
				title: formData.title,
				slug: formData.slug,
				description: null,
				date: formData.year || null,
				location: formData.location || null,
				showInUniverse: formData.showInUniverse,
				status: formData.status,
				content: formData.content
			}

			const url = mode === 'edit' ? `/api/albums/${album?.id}` : '/api/albums'
			const method = mode === 'edit' ? 'PUT' : 'POST'

			const response = await fetch(url, {
				method,
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload),
				credentials: 'same-origin'
			})

			if (!response.ok) {
				const errorData = await response.json()
				throw new Error(
					errorData.message || `Failed to ${mode === 'edit' ? 'save' : 'create'} album`
				)
			}

			const savedAlbum = await response.json()

			toast.dismiss(loadingToastId)

			// Add pending photos to newly created album
			if (mode === 'create' && pendingMediaIds.length > 0) {
				const photoToastId = toast.loading('Adding selected photos to album...')
				try {
					const photoResponse = await fetch(`/api/albums/${savedAlbum.id}/media`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({ mediaIds: pendingMediaIds }),
						credentials: 'same-origin'
					})

					if (!photoResponse.ok) {
						throw new Error('Failed to add photos to album')
					}

					toast.dismiss(photoToastId)
					toast.success(
						`Album created with ${pendingMediaIds.length} photo${pendingMediaIds.length !== 1 ? 's' : ''}!`
					)
				} catch (err) {
					toast.dismiss(photoToastId)
					toast.error(
						'Album created but failed to add photos. You can add them by editing the album.'
					)
					console.error('Failed to add photos:', err)
				}
			} else {
				toast.success(`Album ${mode === 'edit' ? 'saved' : 'created'} successfully!`)
			}

			if (mode === 'create') {
				goto(`/admin/albums/${savedAlbum.id}/edit`)
			} else if (mode === 'edit' && album) {
				// Update the album object to reflect saved changes
				album = savedAlbum
				populateFormData(savedAlbum)
			}
		} catch (err) {
			toast.dismiss(loadingToastId)
			toast.error(
				err instanceof Error
					? err.message
					: `Failed to ${mode === 'edit' ? 'save' : 'create'} album`
			)
			console.error(err)
		} finally {
			isSaving = false
		}
	}

	async function handleBulkAlbumSave() {
		// Reload album to get updated photo count
		if (album && mode === 'edit') {
			await loadAlbumMedia()
		}
	}

	function handleContentUpdate(content: JSONContent) {
		formData.content = content
	}

	function handlePhotoSelection(media: Media[]) {
		pendingMediaIds = media.map((m) => m.id)
	}
</script>

<AdminPage>
	<header slot="header">
		<div class="header-left">
			<h1 class="form-title">{formData.title || 'Untitled Album'}</h1>
		</div>
		<div class="header-center">
			<AdminSegmentedControl
				options={tabOptions}
				value={activeTab}
				onChange={(value) => (activeTab = value)}
			/>
		</div>
		<div class="header-actions">
			{#if !isLoading}
				<AutoSaveStatus
					status="idle"
					lastSavedAt={album?.updatedAt}
				/>
			{/if}
		</div>
	</header>

	<div class="admin-container">
		{#if isLoading}
			<div class="loading">Loading album...</div>
		{:else}
			<div class="tab-panels">
				<!-- Metadata Panel -->
				<div class="panel content-wrapper" class:active={activeTab === 'metadata'}>
					<!-- Album Details -->
					<div class="form-section">
						<Input
							label="Title"
							size="jumbo"
							bind:value={formData.title}
							placeholder="Album title"
							required
						/>

						<Input
							label="Slug"
							bind:value={formData.slug}
							placeholder="url-friendly-name"
							required
							disabled={mode === 'edit'}
						/>

						<div class="form-grid">
							<Input
								label="Location"
								bind:value={formData.location}
								placeholder="e.g. Tokyo, Japan"
							/>
							<Input
								label="Year"
								type="text"
								bind:value={formData.year}
								placeholder="e.g. 2023 or 2023-2025"
							/>
						</div>

						<DropdownSelectField
							label="Status"
							bind:value={formData.status}
							options={statusOptions}
						/>
					</div>

					<!-- Display Settings -->
					<div class="form-section">
						<label class="toggle-label">
							<input
								type="checkbox"
								bind:checked={formData.showInUniverse}
								class="toggle-input"
							/>
							<div class="toggle-content">
								<span class="toggle-title">Show in Universe</span>
								<span class="toggle-description">Display this album in the Universe feed</span>
							</div>
							<span class="toggle-slider"></span>
						</label>
					</div>

					<!-- Photos Grid -->
					<div class="form-section">
						<div class="section-header">
							<h3 class="section-title">
								Photos {albumMedia.length > 0 || pendingMediaIds.length > 0
									? `(${mode === 'edit' ? albumMedia.length : pendingMediaIds.length})`
									: ''}
							</h3>
							<button class="btn-secondary" onclick={() => (showBulkAlbumModal = true)}>
								{mode === 'create' ? 'Select Photos' : 'Manage Photos'}
							</button>
						</div>
						{#if mode === 'edit' && albumMedia.length > 0}
							<div class="photos-grid">
								{#each albumMedia as item}
									<div class="photo-item">
										<SmartImage
											media={item.media}
											alt={item.media.description || item.media.filename}
											sizes="(max-width: 768px) 50vw, 25vw"
										/>
									</div>
								{/each}
							</div>
						{:else if mode === 'create' && pendingMediaIds.length > 0}
							<p class="selected-count">
								{pendingMediaIds.length} photo{pendingMediaIds.length !== 1 ? 's' : ''} selected. They
								will be added when you save the album.
							</p>
						{:else}
							<p class="empty-state">
								No photos {mode === 'create' ? 'selected' : 'added'} yet. Click "{mode === 'create'
									? 'Select Photos'
									: 'Manage Photos'}" to {mode === 'create' ? 'select' : 'add'} photos.
							</p>
						{/if}
					</div>
				</div>

				<!-- Content Panel -->
				<div class="panel panel-content" class:active={activeTab === 'content'}>
					<Composer
						bind:this={editorInstance}
						bind:data={formData.content}
						placeholder="Add album content..."
						onChange={handleContentUpdate}
						albumId={album?.id}
						variant="full"
					/>
				</div>
			</div>
		{/if}
	</div>
</AdminPage>

<!-- Media Modal -->
<UnifiedMediaModal
	bind:isOpen={showBulkAlbumModal}
	albumId={album?.id}
	selectedIds={mode === 'edit' ? existingMediaIds : pendingMediaIds}
	showInAlbumMode={mode === 'edit'}
	onSave={mode === 'edit' ? handleBulkAlbumSave : undefined}
	onSelect={mode === 'create' ? handlePhotoSelection : undefined}
	mode="multiple"
	title={mode === 'create' ? 'Select Photos for Album' : 'Manage Album Photos'}
	confirmText={mode === 'create' ? 'Select Photos' : 'Update Photos'}
/>

<style lang="scss">
	header {
		display: grid;
		grid-template-columns: 250px 1fr 250px;
		align-items: center;
		width: 100%;
		gap: $unit-2x;

		.header-left {
			width: 250px;
			display: flex;
			align-items: center;
			gap: $unit-2x;
		}

		.header-center {
			display: flex;
			justify-content: center;
			align-items: center;
		}

		.header-actions {
			width: 250px;
			display: flex;
			justify-content: flex-end;
			gap: $unit-2x;
		}
	}

	.form-title {
		margin: 0;
		font-size: 1rem;
		font-weight: 500;
		color: $gray-20;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.btn-icon {
		width: 40px;
		height: 40px;
		border: none;
		background: none;
		color: $gray-40;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		transition: all 0.2s ease;

		&:hover {
			background: $gray-90;
			color: $gray-10;
		}
	}

	.admin-container {
		width: 100%;
		margin: 0 auto;
		padding: 0 $unit-2x $unit-4x;
		box-sizing: border-box;

		@include breakpoint('phone') {
			padding: 0 $unit-2x $unit-2x;
		}
	}

	.tab-panels {
		position: relative;

		.panel {
			display: none;
			box-sizing: border-box;

			&.active {
				display: block;
			}
		}
	}

	.content-wrapper {
		background: white;
		border-radius: $unit-2x;
		width: 100%;
		margin: 0 auto;

		@include breakpoint('phone') {
			padding: $unit-3x;
		}
	}

	.loading {
		text-align: center;
		padding: $unit-6x;
		color: $gray-40;
	}

	.form-section {
		display: flex;
		flex-direction: column;
		gap: $unit-4x;

		&:not(:last-child) {
			margin-bottom: $unit-6x;
		}
	}

	.section-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: $gray-10;
		margin: 0;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.form-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: $unit-3x;

		@include breakpoint('phone') {
			grid-template-columns: 1fr;
		}
	}

	.photos-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: $unit-2x;

		@include breakpoint('phone') {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.photo-item {
		aspect-ratio: 1;
		overflow: hidden;
		border-radius: $unit;
		background: $gray-95;

		:global(img) {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}
	}

	.panel-content {
		background: white;
		padding: 0;
		min-height: 80vh;
		margin: 0 auto;
		display: flex;
		flex-direction: column;

		@include breakpoint('phone') {
			min-height: 600px;
		}
	}

	// Toggle styles
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
		background-color: $gray-80;
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
			color: $gray-10;
			font-size: 0.875rem;
		}

		.toggle-description {
			font-size: 0.75rem;
			color: $gray-50;
			line-height: 1.4;
		}
	}

	// Button styles
	.btn-secondary {
		padding: $unit $unit-2x;
		border: 1px solid $gray-80;
		background: white;
		color: $gray-20;
		border-radius: 8px;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s ease;

		&:hover {
			background: $gray-95;
			border-color: $gray-70;
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}

	.empty-state {
		color: $gray-50;
		font-size: 0.875rem;
		text-align: center;
		padding: $unit-4x;
		background: $gray-95;
		border-radius: $unit;
		margin: 0;
	}

	.selected-count {
		color: $gray-30;
		font-size: 0.875rem;
		padding: $unit-2x;
		margin: 0;
		background: $gray-95;
		border-radius: $unit;
		border: 1px solid $gray-90;
	}
</style>
