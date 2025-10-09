<script lang="ts">
	import { goto, invalidate } from '$app/navigation'
	import { page } from '$app/stores'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import AdminHeader from '$lib/components/admin/AdminHeader.svelte'
	import AdminFilters from '$lib/components/admin/AdminFilters.svelte'
	import EmptyState from '$lib/components/admin/EmptyState.svelte'
	import Input from '$lib/components/admin/Input.svelte'
	import Select from '$lib/components/admin/Select.svelte'
	import Button from '$lib/components/admin/Button.svelte'
	import DropdownMenuContainer from '$lib/components/admin/DropdownMenuContainer.svelte'
	import DropdownItem from '$lib/components/admin/DropdownItem.svelte'
	import MediaDetailsModal from '$lib/components/admin/MediaDetailsModal.svelte'
	import MediaUploadModal from '$lib/components/admin/MediaUploadModal.svelte'
	import AlbumSelectorModal from '$lib/components/admin/AlbumSelectorModal.svelte'
	import ChevronDown from '$icons/chevron-down.svg?component'
	import PlayIcon from '$icons/play.svg?component'
	import { toast } from '$lib/stores/toast'
	import type { Media } from '@prisma/client'
	import type { PageData } from './$types'

	const { data } = $props<{ data: PageData }>()

	const media = $derived(data.items ?? [])
	const currentPage = $derived(data.pagination?.page ?? 1)
	const totalPages = $derived(data.pagination?.totalPages ?? 1)
	const total = $derived(data.pagination?.total ?? 0)

	// Read filter states from URL
	const filterType = $derived($page.url.searchParams.get('mimeType') ?? 'all')
	const publishedFilter = $derived($page.url.searchParams.get('publishedFilter') ?? 'all')
	const sortBy = $derived($page.url.searchParams.get('sort') ?? 'newest')

	let searchQuery = $state($page.url.searchParams.get('search') ?? '')
	let searchTimeout: ReturnType<typeof setTimeout>

	// Filter options
	const typeFilterOptions = [
		{ value: 'all', label: 'All types' },
		{ value: 'image', label: 'Images' },
		{ value: 'video', label: 'Videos' },
		{ value: 'audio', label: 'Audio' },
		{ value: 'vector', label: 'Vectors' }
	]

	const publishedFilterOptions = [
		{ value: 'all', label: 'Published in' },
		{ value: 'photos', label: 'Photos' },
		{ value: 'universe', label: 'Universe' },
		{ value: 'unpublished', label: 'Unpublished' }
	]

	const sortOptions = [
		{ value: 'newest', label: 'Newest first' },
		{ value: 'oldest', label: 'Oldest first' },
		{ value: 'name-asc', label: 'Name (A-Z)' },
		{ value: 'name-desc', label: 'Name (Z-A)' },
		{ value: 'size-asc', label: 'Size (smallest)' },
		{ value: 'size-desc', label: 'Size (largest)' }
	]

	// Modal states
	let selectedMedia = $state<Media | null>(null)
	let isDetailsModalOpen = $state(false)
	let isUploadModalOpen = $state(false)
	let showBulkAlbumModal = $state(false)

	// Multiselect states
	let selectedMediaIds = $state<Set<number>>(new Set())
	let isMultiSelectMode = $state(false)
	let isDeleting = $state(false)

	// Dropdown state
	let isDropdownOpen = $state(false)

	// Watch for search query changes with debounce
	$effect(() => {
		if (searchQuery !== undefined) {
			clearTimeout(searchTimeout)
			searchTimeout = setTimeout(() => {
				updateURL({ search: searchQuery || undefined })
			}, 300)
		}
	})

	function updateURL(params: Record<string, string | undefined>) {
		const url = new URL($page.url)

		// Update or remove params
		Object.entries(params).forEach(([key, value]) => {
			if (value && value !== 'all') {
				url.searchParams.set(key, value)
			} else {
				url.searchParams.delete(key)
			}
		})

		// Reset to page 1 if filters changed (not page navigation)
		if (!params.page) {
			url.searchParams.delete('page')
		}

		goto(url.toString(), { replaceState: false, keepFocus: true })
	}

	function handlePageChange(page: number) {
		updateURL({ page: String(page) })
	}

	function handleTypeFilterChange(value: string) {
		updateURL({ mimeType: value })
	}

	function handlePublishedFilterChange(value: string) {
		updateURL({ publishedFilter: value })
	}

	function handleSortChange(value: string) {
		updateURL({ sort: value })
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

	function isVideoFile(mimeType: string): boolean {
		return mimeType.startsWith('video/')
	}

	function handleMediaClick(item: Media) {
		selectedMedia = item
		isDetailsModalOpen = true
	}

	function handleModalClose() {
		selectedMedia = null
		isDetailsModalOpen = false
	}

	async function handleMediaUpdate(updatedMedia: Media) {
		// Invalidate to reload from server
		await invalidate('admin:media')
	}

	async function handleUploadComplete() {
		// Reload media list after successful upload
		await invalidate('admin:media')
	}

	function openUploadModal() {
		isUploadModalOpen = true
		isDropdownOpen = false
	}

	function handleDropdownToggle(e: MouseEvent) {
		e.stopPropagation()
		isDropdownOpen = !isDropdownOpen
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement
		if (!target.closest('.actions-dropdown')) {
			isDropdownOpen = false
		}
	}

	function handleAuditStorage() {
		goto('/admin/media/audit')
	}

	$effect(() => {
		if (isDropdownOpen) {
			document.addEventListener('click', handleClickOutside)
			return () => document.removeEventListener('click', handleClickOutside)
		}
	})

	// Multiselect functions
	function toggleMultiSelectMode() {
		isMultiSelectMode = !isMultiSelectMode
		isDropdownOpen = false
		if (!isMultiSelectMode) {
			selectedMediaIds.clear()
			selectedMediaIds = new Set()
		}
	}

	function toggleMediaSelection(mediaId: number) {
		if (selectedMediaIds.has(mediaId)) {
			selectedMediaIds.delete(mediaId)
		} else {
			selectedMediaIds.add(mediaId)
		}
		selectedMediaIds = new Set(selectedMediaIds) // Trigger reactivity
	}

	function selectAllMedia() {
		selectedMediaIds = new Set(media.map((m) => m.id))
	}

	function clearSelection() {
		selectedMediaIds.clear()
		selectedMediaIds = new Set()
	}

	async function handleBulkDelete() {
		if (selectedMediaIds.size === 0) return

		const confirmation = confirm(
			`Are you sure you want to delete ${selectedMediaIds.size} media file${selectedMediaIds.size > 1 ? 's' : ''}? This action cannot be undone and will remove these files from any content that references them.`
		)

		if (!confirmation) return

		try {
			isDeleting = true
			const response = await fetch('/api/media/bulk-delete', {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json'
				},
				credentials: 'same-origin',
				body: JSON.stringify({
					mediaIds: Array.from(selectedMediaIds)
				})
			})

			if (!response.ok) {
				throw new Error('Failed to delete media files')
			}
			await response.json()

			// Clear selection and exit multiselect mode
			selectedMediaIds.clear()
			selectedMediaIds = new Set()
			isMultiSelectMode = false

			// Reload to get updated data
			await invalidate('admin:media')
		} catch (err) {
			toast.error('Failed to delete media files. Please try again.')
			console.error('Failed to delete media:', err)
		} finally {
			isDeleting = false
		}
	}

	async function handleBulkMarkPhotography() {
		if (selectedMediaIds.size === 0) return

		try {
			// Update each selected media item
			const promises = Array.from(selectedMediaIds).map(async (mediaId) => {
				const response = await fetch(`/api/media/${mediaId}`, {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json'
					},
					credentials: 'same-origin',
					body: JSON.stringify({ isPhotography: true })
				})

				if (!response.ok) {
					throw new Error(`Failed to update media ${mediaId}`)
				}
				return response.json()
			})

			await Promise.all(promises)

			// Clear selection
			selectedMediaIds.clear()
			selectedMediaIds = new Set()
			isMultiSelectMode = false

			// Reload to get updated data
			await invalidate('admin:media')
		} catch (err) {
			toast.error('Failed to mark items as photography. Please try again.')
			console.error('Failed to mark as photography:', err)
		}
	}

	async function handleBulkUnmarkPhotography() {
		if (selectedMediaIds.size === 0) return

		try {
			// Update each selected media item
			const promises = Array.from(selectedMediaIds).map(async (mediaId) => {
				const response = await fetch(`/api/media/${mediaId}`, {
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json'
					},
					credentials: 'same-origin',
					body: JSON.stringify({ isPhotography: false })
				})

				if (!response.ok) {
					throw new Error(`Failed to update media ${mediaId}`)
				}
				return response.json()
			})

			await Promise.all(promises)

			// Clear selection
			selectedMediaIds.clear()
			selectedMediaIds = new Set()
			isMultiSelectMode = false

			// Reload to get updated data
			await invalidate('admin:media')
		} catch (err) {
			toast.error('Failed to remove photography status. Please try again.')
			console.error('Failed to unmark photography:', err)
		}
	}
</script>

<svelte:head>
	<title>Media Library - Admin @jedmund</title>
</svelte:head>

<AdminPage>
	<AdminHeader title="Media Library" slot="header">
		{#snippet actions()}
			<div class="actions-dropdown">
				<Button variant="primary" buttonSize="large" onclick={openUploadModal}>Upload</Button>
				<Button variant="ghost" iconOnly buttonSize="large" onclick={handleDropdownToggle}>
					{#snippet icon()}
						<ChevronDown />
					{/snippet}
				</Button>

				{#if isDropdownOpen}
					<DropdownMenuContainer>
						<DropdownItem onclick={toggleMultiSelectMode}>
							{isMultiSelectMode ? 'Exit Select' : 'Select Files'}
						</DropdownItem>
						<DropdownItem onclick={handleAuditStorage}>Audit Storage</DropdownItem>
						<DropdownItem onclick={() => goto('/admin/media/regenerate')}>
							Regenerate Cloudinary
						</DropdownItem>
					</DropdownMenuContainer>
				{/if}
			</div>
		{/snippet}
	</AdminHeader>

	<!-- Filters -->
		<AdminFilters>
			{#snippet left()}
				<Select
					value={filterType}
					options={typeFilterOptions}
					size="small"
					variant="minimal"
					onchange={(e) => handleTypeFilterChange((e.target as HTMLSelectElement).value)}
				/>
				<Select
					value={publishedFilter}
					options={publishedFilterOptions}
					size="small"
					variant="minimal"
					onchange={(e) => handlePublishedFilterChange((e.target as HTMLSelectElement).value)}
				/>
			{/snippet}
			{#snippet right()}
				<Select
					value={sortBy}
					options={sortOptions}
					size="small"
					variant="minimal"
					onchange={(e) => handleSortChange((e.target as HTMLSelectElement).value)}
				/>
				<Input
					type="search"
					bind:value={searchQuery}
					placeholder="Search files..."
					buttonSize="small"
					fullWidth={false}
					pill={true}
					prefixIcon
				>
					<svg
						slot="prefix"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
						/>
					</svg>
				</Input>
			{/snippet}
		</AdminFilters>

		{#if isMultiSelectMode && media.length > 0}
			<div class="bulk-actions">
				<div class="bulk-actions-left">
					<button
						onclick={selectAllMedia}
						class="btn btn-secondary btn-small"
						disabled={selectedMediaIds.size === media.length}
					>
						Select All ({media.length})
					</button>
					<button
						onclick={clearSelection}
						class="btn btn-secondary btn-small"
						disabled={selectedMediaIds.size === 0}
					>
						Clear Selection
					</button>
				</div>
				<div class="bulk-actions-right">
					{#if selectedMediaIds.size > 0}
						<button
							onclick={handleBulkMarkPhotography}
							class="btn btn-secondary btn-small"
							title="Mark selected items as photography"
						>
							Mark Photography
						</button>
						<button
							onclick={handleBulkUnmarkPhotography}
							class="btn btn-secondary btn-small"
							title="Remove photography status from selected items"
						>
							Remove Photography
						</button>
						<button
							onclick={() => (showBulkAlbumModal = true)}
							class="btn btn-secondary btn-small"
							title="Add or remove selected items from albums"
						>
							Manage Albums
						</button>
						<button
							onclick={handleBulkDelete}
							class="btn btn-danger btn-small"
							disabled={isDeleting}
						>
							{isDeleting
								? 'Deleting...'
								: `Delete ${selectedMediaIds.size} file${selectedMediaIds.size > 1 ? 's' : ''}`}
						</button>
					{/if}
				</div>
			</div>
		{/if}

		{#if media.length === 0}
			<EmptyState title="No media files found" message="Upload your first file to get started.">
				{#snippet action()}
					<Button variant="primary" onclick={openUploadModal}>Upload your first file</Button>
				{/snippet}
			</EmptyState>
		{:else}
			<div class="media-grid">
				{#each media as item}
					<div class="media-item-wrapper" class:multiselect={isMultiSelectMode}>
						{#if isMultiSelectMode}
							<div class="selection-checkbox">
								<input
									type="checkbox"
									checked={selectedMediaIds.has(item.id)}
									onchange={() => toggleMediaSelection(item.id)}
									id="media-{item.id}"
								/>
								<label for="media-{item.id}" class="checkbox-label"></label>
							</div>
						{/if}
						<button
							class="media-item"
							type="button"
							onclick={() =>
								isMultiSelectMode ? toggleMediaSelection(item.id) : handleMediaClick(item)}
							title="{isMultiSelectMode ? 'Click to select' : 'Click to edit'} {item.filename}"
							class:selected={isMultiSelectMode && selectedMediaIds.has(item.id)}
						>
							{#if item.mimeType.startsWith('image/')}
								<img
									src={item.mimeType === 'image/svg+xml' ? item.url : item.thumbnailUrl || item.url}
									alt={item.description || item.filename}
								/>
							{:else if isVideoFile(item.mimeType)}
								{#if item.thumbnailUrl}
									<div class="video-thumbnail-wrapper">
										<img src={item.thumbnailUrl} alt={item.description || item.filename} />
										<div class="video-overlay">
											<PlayIcon class="play-icon" />
										</div>
									</div>
								{:else}
									<div class="file-placeholder video-placeholder">
										<PlayIcon class="video-icon" />
										<span class="file-type">Video</span>
									</div>
								{/if}
							{:else}
								<div class="file-placeholder">
									<span class="file-type">{getFileType(item.mimeType)}</span>
								</div>
							{/if}
							<div class="media-info">
								<span class="filename">{item.filename}</span>
								<div class="media-info-bottom">
									<div class="media-indicators">
										{#if item.isPhotography}
											<span class="indicator-pill photography" title="Photography"> Photo </span>
										{/if}
										{#if item.description}
											<span class="indicator-pill alt-text" title="Description: {item.description}">
												Alt
											</span>
										{:else}
											<span class="indicator-pill no-alt-text" title="No description">
												No Alt
											</span>
										{/if}
									</div>
									<span class="filesize">{formatFileSize(item.size)}</span>
								</div>
							</div>
						</button>
					</div>
				{/each}
			</div>
		{/if}

		{#if totalPages > 1}
			<div class="pagination">
				<button
					onclick={() => handlePageChange(currentPage - 1)}
					disabled={currentPage === 1}
					class="pagination-btn"
				>
					Previous
				</button>
				<span class="pagination-info">
					Page {currentPage} of {totalPages}
				</span>
				<button
					onclick={() => handlePageChange(currentPage + 1)}
					disabled={currentPage === totalPages}
					class="pagination-btn"
				>
					Next
				</button>
			</div>
		{/if}
</AdminPage>

<!-- Media Details Modal -->
<MediaDetailsModal
	bind:isOpen={isDetailsModalOpen}
	media={selectedMedia}
	onClose={handleModalClose}
	onUpdate={handleMediaUpdate}
/>

<!-- Media Upload Modal -->
<MediaUploadModal
	bind:isOpen={isUploadModalOpen}
	onClose={() => (isUploadModalOpen = false)}
	onUploadComplete={handleUploadComplete}
/>

<!-- Bulk Album Modal -->
<AlbumSelectorModal
	bind:isOpen={showBulkAlbumModal}
	selectedMediaIds={Array.from(selectedMediaIds)}
	onSave={() => {
		// Optionally refresh the media list or show a success message
		clearSelection()
		isMultiSelectMode = false
	}}
/>

<style lang="scss">
	.btn {
		padding: $unit-2x $unit-3x;
		border-radius: 50px;
		text-decoration: none;
		font-size: 0.925rem;
		transition: all 0.2s ease;
		border: none;
		cursor: pointer;

		&.btn-primary {
			background-color: $gray-10;
			color: white;

			&:hover {
				background-color: $gray-20;
			}
		}

		&.btn-secondary {
			background-color: $gray-95;
			color: $gray-20;

			&:hover {
				background-color: $gray-90;
				color: $gray-10;
			}
		}
	}

	.actions-dropdown {
		position: relative;
		display: flex;
		gap: $unit-half;

		:global(svg) {
			width: 12px;
			height: 12px;
			fill: none;
			stroke: currentColor;
			stroke-width: 2;
			stroke-linecap: round;
			stroke-linejoin: round;
		}
	}

	// Ensure search input matches filter dropdown sizing
	:global(.admin-filters) {
		:global(input[type='search']) {
			height: 36px; // Match Select component small size
			font-size: 0.875rem; // Match Select component font size
			min-width: 200px; // Wider to show full placeholder
		}

		// Make the sort dropdown narrower
		:global(.admin-filters__right) {
			:global(.select:first-child) {
				min-width: 140px;
				max-width: 160px;
			}
		}
	}

	.error {
		text-align: center;
		padding: $unit-6x;
		color: $error-text;
	}

	.loading {
		text-align: center;
		padding: $unit-6x;
		color: $gray-40;
	}

	.media-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: $unit-3x;
		margin-bottom: $unit-4x;
		padding: 0 $unit;
	}

	.media-item {
		background: $gray-95;
		border: 1px solid transparent;
		border-radius: $unit-2x;
		overflow: hidden;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: left;
		width: 100%;
		padding: 0;

		&:hover {
			background-color: $gray-90;
			transform: translateY(-2px);
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
			border: 1px solid rgba(0, 0, 0, 0.08);
		}

		&:focus {
			outline: 2px solid #3b82f6;
			outline-offset: 2px;
		}

		img {
			width: 100%;
			height: 150px;
			object-fit: cover;
		}

		.video-thumbnail-wrapper {
			width: 100%;
			height: 150px;
			position: relative;
			overflow: hidden;

			img {
				width: 100%;
				height: 100%;
				object-fit: cover;
			}

			.video-overlay {
				position: absolute;
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%);
				background: rgba(0, 0, 0, 0.7);
				border-radius: 50%;
				width: 40px;
				height: 40px;
				display: flex;
				align-items: center;
				justify-content: center;
				pointer-events: none;

				:global(.play-icon) {
					width: 20px;
					height: 20px;
					color: white;
					margin-left: -2px;
				}
			}
		}

		.file-placeholder {
			width: 100%;
			height: 150px;
			display: flex;
			align-items: center;
			justify-content: center;
			background: $gray-90;

			&.video-placeholder {
				flex-direction: column;
				gap: $unit;

				:global(.video-icon) {
					width: 24px;
					height: 24px;
					color: $gray-60;
				}
			}

			.file-type {
				font-size: 0.875rem;
				color: $gray-40;
			}
		}

		.media-info {
			padding: $unit-2x;
			display: flex;
			flex-direction: column;
			gap: $unit;

			.filename {
				font-size: 1rem;
				color: $gray-20;
				font-weight: 400;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}

			.filesize {
				font-size: 0.75rem;
				color: $gray-40;
			}

			.media-info-bottom {
				display: flex;
				justify-content: space-between;
				align-items: center;
				gap: $unit-half;
			}

			.media-indicators {
				display: flex;
				gap: $unit-half;
				flex-wrap: wrap;
				margin: $unit-half 0;
			}
		}
	}

	.media-list {
		display: flex;
		flex-direction: column;
		gap: $unit;
		margin-bottom: $unit-4x;
	}

	.media-row {
		display: flex;
		align-items: center;
		gap: $unit-3x;
		padding: $unit-2x;
		background: $gray-95;
		border: none;
		border-radius: $unit-2x;
		transition: all 0.2s ease;
		cursor: pointer;
		text-align: left;
		width: 100%;

		&:hover {
			background-color: $gray-90;
			transform: translateY(-1px);
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		}

		&:focus {
			outline: 2px solid #3b82f6;
			outline-offset: 2px;
		}

		.media-preview {
			width: 60px;
			height: 60px;
			flex-shrink: 0;

			img {
				width: 100%;
				height: 100%;
				object-fit: cover;
				border-radius: $unit;
			}

			.file-icon {
				width: 100%;
				height: 100%;
				display: flex;
				align-items: center;
				justify-content: center;
				background: $gray-90;
				border-radius: $unit;
				font-size: 0.75rem;
				color: $gray-40;
			}
		}

		.media-details {
			flex: 1;
			display: flex;
			flex-direction: column;
			gap: $unit-half;

			.filename-row {
				display: flex;
				align-items: center;
				justify-content: space-between;
				gap: $unit-2x;

				.filename {
					font-size: 0.925rem;
					color: $gray-20;
					font-weight: 500;
					flex: 1;
				}

				.media-indicators {
					display: flex;
					gap: $unit-half;
					flex-wrap: wrap;
					flex-shrink: 0;
				}
			}

			.file-meta {
				font-size: 0.75rem;
				color: $gray-40;
			}

			.alt-text-preview {
				font-size: 0.75rem;
				color: $gray-30;
				font-style: italic;
			}

			.no-alt-text-preview {
				font-size: 0.75rem;
				color: $red-60;
				font-style: italic;
			}
		}

		.media-indicator {
			color: $gray-50;
			flex-shrink: 0;
		}

		.media-actions {
			display: flex;
			gap: $unit;

			.action-btn {
				padding: $unit $unit-2x;
				background: transparent;
				border: 1px solid $gray-80;
				border-radius: 50px;
				font-size: 0.75rem;
				color: $gray-30;
				cursor: pointer;
				transition: all 0.2s ease;

				&:hover {
					border-color: $gray-40;
					color: $gray-10;
				}
			}
		}
	}

	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: $unit-3x;
		margin-top: $unit-4x;

		.pagination-btn {
			padding: $unit $unit-3x;
			background: $gray-95;
			border: none;
			border-radius: 50px;
			color: $gray-20;
			font-size: 0.875rem;
			cursor: pointer;
			transition: all 0.2s ease;

			&:hover:not(:disabled) {
				background: $gray-90;
				color: $gray-10;
			}

			&:disabled {
				opacity: 0.5;
				cursor: not-allowed;
			}
		}

		.pagination-info {
			font-size: 0.875rem;
			color: $gray-40;
		}
	}

	// Multiselect styles
	.bulk-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: $unit-2x $unit-3x;
		background: $gray-95;
		border-radius: $unit;
		margin-bottom: $unit-3x;
		gap: $unit-2x;

		.bulk-actions-left,
		.bulk-actions-right {
			display: flex;
			gap: $unit;
		}

		.btn-small {
			padding: $unit $unit-2x;
			font-size: 0.8rem;
		}

		.btn-danger {
			background-color: $red-60;
			color: white;

			&:hover:not(:disabled) {
				background-color: $red-50;
			}

			&:disabled {
				opacity: 0.6;
				cursor: not-allowed;
			}
		}
	}

	.media-item-wrapper,
	.media-row-wrapper {
		position: relative;

		&.multiselect {
			.selection-checkbox {
				position: absolute;
				top: $unit;
				left: $unit;
				z-index: 10;

				input[type='checkbox'] {
					opacity: 0;
					position: absolute;
					pointer-events: none;
				}

				.checkbox-label {
					display: block;
					width: 20px;
					height: 20px;
					border: 2px solid white;
					border-radius: 4px;
					background: rgba(0, 0, 0, 0.5);
					cursor: pointer;
					position: relative;
					transition: all 0.2s ease;

					&::after {
						content: '';
						position: absolute;
						top: 50%;
						left: 50%;
						width: 4px;
						height: 8px;
						border: solid white;
						border-width: 0 2px 2px 0;
						transform: translate(-50%, -60%) rotate(45deg);
						opacity: 0;
						transition: opacity 0.2s ease;
					}
				}

				input:checked + .checkbox-label {
					background: #3b82f6;
					border-color: #3b82f6;

					&::after {
						opacity: 1;
					}
				}
			}

			.media-item,
			.media-row {
				&.selected {
					background-color: rgba(59, 130, 246, 0.1);
					border: 2px solid #3b82f6;
				}
			}
		}
	}

	.media-row-wrapper.multiselect {
		display: flex;
		align-items: center;
		gap: $unit-2x;

		.selection-checkbox {
			position: static;
			top: auto;
			left: auto;
			z-index: auto;
		}

		.media-row {
			flex: 1;
		}
	}

	// Indicator pill styles
	.indicator-pill {
		display: inline-flex;
		align-items: center;
		gap: $unit-half;
		padding: $unit-half $unit;
		border-radius: $corner-radius-2xl;
		font-size: 0.8rem;
		font-weight: 500;
		line-height: 1;

		svg {
			width: 10px;
			height: 10px;
			flex-shrink: 0;
		}

		&.photography {
			background-color: rgba(139, 92, 246, 0.1);
			color: #7c3aed;

			svg {
				fill: #7c3aed;
			}
		}

		&.alt-text {
			background-color: rgba(34, 197, 94, 0.1);
			color: #16a34a;
		}

		&.no-alt-text {
			background-color: rgba(239, 68, 68, 0.1);
			color: #dc2626;
		}
	}
</style>
