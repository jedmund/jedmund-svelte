<script lang="ts">
	import Modal from './Modal.svelte'
	import AdminFilters from './AdminFilters.svelte'
	import Select from './Select.svelte'
	import Input from './Input.svelte'
	import Button from './Button.svelte'
	import CloseButton from '../icons/CloseButton.svelte'
	import LoadingSpinner from './LoadingSpinner.svelte'
	import MediaGrid from './MediaGrid.svelte'
	import { InfiniteLoader, LoaderState } from 'svelte-infinite'
	import type { Media } from '@prisma/client'

	interface Props {
		isOpen: boolean
		mode?: 'single' | 'multiple'
		fileType?: 'image' | 'video' | 'all'
		albumId?: number
		selectedIds?: number[]
		title?: string
		confirmText?: string
		showInAlbumMode?: boolean
		onSelect?: (media: Media | Media[]) => void
		onClose?: () => void
		onSave?: () => void
	}

	let {
		isOpen = $bindable(),
		mode = 'multiple',
		fileType = 'all',
		albumId,
		selectedIds = [],
		title = '',
		confirmText = '',
		showInAlbumMode = false,
		onSelect,
		onClose,
		onSave
	}: Props = $props()

	// State
	let media = $state<Media[]>([])
	let isSaving = $state(false)
	let error = $state('')
	let currentPage = $state(1)
	let totalPages = $state(1)

	// Media selection state
	let selectedMediaIds = $state<Set<number>>(new Set(selectedIds))
	let initialMediaIds = $state<Set<number>>(new Set(selectedIds))

	// Derived selection values
	const selectedMedia = $derived(media.filter((m) => selectedMediaIds.has(m.id)))
	const hasSelection = $derived(selectedMediaIds.size > 0)
	const selectionCount = $derived(selectedMediaIds.size)

	// Track changes for add/remove operations
	const mediaToAdd = $derived(() => {
		const toAdd = new Set<number>()
		selectedMediaIds.forEach((id) => {
			if (!initialMediaIds.has(id)) {
				toAdd.add(id)
			}
		})
		return toAdd
	})

	const mediaToRemove = $derived(() => {
		const toRemove = new Set<number>()
		initialMediaIds.forEach((id) => {
			if (!selectedMediaIds.has(id)) {
				toRemove.add(id)
			}
		})
		return toRemove
	})

	// Filter states
	let filterType = $state<string>(fileType === 'all' ? 'all' : fileType)
	let photographyFilter = $state<string>('all')
	let searchQuery = $state('')
	let searchTimeout: ReturnType<typeof setTimeout>

	// Infinite scroll state
	const loaderState = new LoaderState()

	// Filter options
	const typeFilterOptions = [
		{ value: 'all', label: 'All types' },
		{ value: 'image', label: 'Images' },
		{ value: 'video', label: 'Videos' }
	]

	const photographyFilterOptions = [
		{ value: 'all', label: 'All Media' },
		{ value: 'true', label: 'Photography' },
		{ value: 'false', label: 'Non-Photography' }
	]

	// Computed properties
	const computedTitle = $derived(
		title ||
			(showInAlbumMode
				? 'Add Photos to Album'
				: mode === 'single'
					? 'Select Media'
					: 'Select Media Files')
	)

	const computedConfirmText = $derived(
		confirmText || (showInAlbumMode ? 'Add Photos' : mode === 'single' ? 'Select' : 'Select Files')
	)

	const canConfirm = $derived(hasSelection && (!showInAlbumMode || albumId))
	const mediaCount = $derived(selectionCount)

	// Selection methods
	function toggleSelection(item: Media) {
		if (mode === 'single') {
			// Single selection mode - replace selection
			selectedMediaIds = new Set([item.id])
		} else {
			// Multiple selection mode - toggle
			const newSet = new Set(selectedMediaIds)
			if (newSet.has(item.id)) {
				newSet.delete(item.id)
			} else {
				newSet.add(item.id)
			}
			// Trigger reactivity by assigning the new Set
			selectedMediaIds = newSet
		}
	}

	function clearSelection() {
		selectedMediaIds = new Set()
	}

	function getSelected(): Media[] {
		return selectedMedia
	}

	const footerText = $derived(() => {
		if (showInAlbumMode) {
			const addCount = mediaToAdd().size
			const removeCount = mediaToRemove().size

			if (addCount === 0 && removeCount === 0) {
				return `${mediaCount} ${mediaCount === 1 ? 'photo' : 'photos'} selected (no changes)`
			}

			const parts = []
			if (addCount > 0) {
				parts.push(`${addCount} to add`)
			}
			if (removeCount > 0) {
				parts.push(`${removeCount} to remove`)
			}

			return `${mediaCount} ${mediaCount === 1 ? 'photo' : 'photos'} selected (${parts.join(', ')})`
		}

		return mode === 'single'
			? canConfirm
				? '1 item selected'
				: 'No item selected'
			: `${mediaCount} item${mediaCount !== 1 ? 's' : ''} selected`
	})

	// State for preventing flicker
	let isInitialLoad = $state(true)

	// Reset state when modal opens
	$effect(() => {
		if (isOpen) {
			// Initialize with selectedIds from props
			selectedMediaIds = new Set(selectedIds)
			initialMediaIds = new Set(selectedIds)
			// Don't clear media immediately - let new data replace old
			currentPage = 1
			isInitialLoad = true
			loaderState.reset()
			loadMedia(1)
		}
	})

	// Watch for filter changes
	let previousFilterType = filterType
	let previousPhotographyFilter = photographyFilter

	$effect(() => {
		if (
			(filterType !== previousFilterType || photographyFilter !== previousPhotographyFilter) &&
			isOpen
		) {
			previousFilterType = filterType
			previousPhotographyFilter = photographyFilter
			currentPage = 1
			media = []
			loaderState.reset()
			loadMedia(1)
		}
	})

	// Watch for search query changes with debounce
	$effect(() => {
		if (searchQuery !== undefined) {
			clearTimeout(searchTimeout)
			searchTimeout = setTimeout(() => {
				currentPage = 1
				media = []
				loaderState.reset()
				loadMedia(1)
			}, 300)
		}
	})

	async function loadMedia(page = currentPage) {
		try {
			// Short delay to prevent flicker
			await new Promise((resolve) => setTimeout(resolve, 500))


			let url = `/api/media?page=${page}&limit=24`

			if (filterType !== 'all') {
				url += `&mimeType=${filterType}`
			}

			if (photographyFilter !== 'all') {
				url += `&isPhotography=${photographyFilter}`
			}

			if (searchQuery) {
				url += `&search=${encodeURIComponent(searchQuery)}`
			}

			// Filter by albumId when we have one and we're not in the "add to album" mode
			// (In "add to album" mode, we want to see all media to add to the album)
			if (albumId && !showInAlbumMode) {
				url += `&albumId=${albumId}`
			}

			const data = await (await import('$lib/admin/api')).api.get(url)

			if (page === 1) {
				// Only clear media after we have new data to prevent flash
				media = data.media
				isInitialLoad = false
			} else {
				media = [...media, ...data.media]
			}

			currentPage = page
			totalPages = data.pagination.totalPages

			// Update loader state
			if (currentPage >= totalPages) {
				loaderState.complete()
			} else {
				loaderState.loaded()
			}
		} catch (error) {
			console.error('Error loading media:', error)
			loaderState.error()
		}
	}

	async function loadMore() {
		if (currentPage < totalPages) {
			await loadMedia(currentPage + 1)
		}
	}

	function handleMediaClick(item: Media) {
		toggleSelection(item)
	}

	async function handleConfirm() {
		if (!canConfirm) return

		// If in album mode, save to album
		if (showInAlbumMode && albumId) {
			try {
				isSaving = true
				error = ''
				const toAdd = Array.from(mediaToAdd())
				const toRemove = Array.from(mediaToRemove())

				// Handle additions
				if (toAdd.length > 0) {
					const response = await fetch(`/api/albums/${albumId}/media`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({ mediaIds: toAdd }),
						credentials: 'same-origin'
					})

					if (!response.ok) {
						throw new Error('Failed to add media to album')
					}
				}

				// Handle removals
				if (toRemove.length > 0) {
					const response = await fetch(`/api/albums/${albumId}/media`, {
						method: 'DELETE',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({ mediaIds: toRemove }),
						credentials: 'same-origin'
					})

					if (!response.ok) {
						throw new Error('Failed to remove media from album')
					}
				}

				handleClose()
				onSave?.()
			} catch (err) {
				console.error('Failed to update album:', err)
				error = err instanceof Error ? err.message : 'Failed to update album'
			} finally {
				isSaving = false
			}
		} else {
			// Regular selection mode
			const selected = getSelected()
			if (mode === 'single') {
				onSelect?.(selected[0])
			} else {
				onSelect?.(selected)
			}

			handleClose()
		}
	}

	function handleClose() {
		clearSelection()
		error = ''
		isOpen = false
		onClose?.()
	}

	function handleCancel() {
		handleClose()
	}
</script>

<Modal bind:isOpen onClose={handleClose} size="large" showCloseButton={false}>
	<div class="unified-media-modal">
		<!-- Sticky Header -->
		<div class="modal-header">
			<div class="header-top">
				<h2>{computedTitle}</h2>
				<button class="close-button" onclick={handleClose} aria-label="Close modal">
					<CloseButton size={20} />
				</button>
			</div>

			{#if error}
				<div class="error-message">{error}</div>
			{/if}

			<!-- Filters -->
			<AdminFilters>
				{#snippet left()}
					<Select
						bind:value={filterType}
						options={typeFilterOptions}
						size="small"
						variant="minimal"
					/>
					<Select
						bind:value={photographyFilter}
						options={photographyFilterOptions}
						size="small"
						variant="minimal"
					/>
				{/snippet}
				{#snippet right()}
					<Input
						type="search"
						bind:value={searchQuery}
						placeholder="Search files..."
						size="small"
						fullWidth={false}
						pill={true}
						prefixIcon
						class="search-input"
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
		</div>

		<!-- Media Grid -->
		<div class="media-grid-container">
			<MediaGrid
				{media}
				selectedIds={selectedMediaIds}
				onItemClick={handleMediaClick}
				isLoading={isInitialLoad && media.length === 0}
				emptyMessage={fileType !== 'all'
					? 'No media found. Try adjusting your filters or search'
					: 'No media found. Try adjusting your search or filters'}
				mode="select"
			/>

			<!-- Infinite Loader -->
			<InfiniteLoader
				{loaderState}
				triggerLoad={loadMore}
				intersectionOptions={{ rootMargin: '0px 0px 200px 0px' }}
			>
				<div style="height: 1px;"></div>

				{#snippet loading()}
					<div class="loading-container">
						<LoadingSpinner size="medium" text="Loading more..." />
					</div>
				{/snippet}

				{#snippet error()}
					<div class="error-retry">
						<p class="error-text">Failed to load media</p>
						<button
							class="retry-button"
							onclick={() => {
								loaderState.reset()
								loadMore()
							}}
						>
							Try again
						</button>
					</div>
				{/snippet}

				{#snippet noData()}
					<!-- Empty snippet to hide "No more data" text -->
				{/snippet}
			</InfiniteLoader>
		</div>

		<!-- Footer -->
		<div class="modal-footer">
			<div class="action-summary">
				<span>{footerText()}</span>
			</div>
			<div class="action-buttons">
				<Button variant="ghost" onclick={handleCancel}>Cancel</Button>
				<Button variant="primary" onclick={handleConfirm} disabled={!canConfirm || isSaving}>
					{#if isSaving}
						<LoadingSpinner buttonSize="small" />
						{showInAlbumMode ? 'Updating...' : 'Selecting...'}
					{:else}
						{computedConfirmText}
					{/if}
				</Button>
			</div>
		</div>
	</div>
</Modal>

<style lang="scss">
	.unified-media-modal {
		display: flex;
		flex-direction: column;
		min-height: 600px;
		position: relative;
		padding: 0;
	}

	.modal-header {
		position: sticky;
		display: flex;
		flex-direction: column;
		gap: $unit;
		top: 0;
		background: white;
		z-index: $z-index-dropdown;
		padding: $unit-3x $unit-3x 0 $unit-3x;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

		h2 {
			margin: 0;
			font-size: 1.5rem;
			font-weight: 600;
			color: $gray-10;
		}

		:global(.admin-filters) {
			padding: 0;
		}
	}

	.header-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: $unit-2x;
	}

	.close-button {
		width: 32px;
		height: 32px;
		border: none;
		background: none;
		color: $gray-40;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		transition: all 0.2s ease;
		padding: 0;

		&:hover {
			background: $gray-90;
			color: $gray-10;
		}

		svg {
			flex-shrink: 0;
		}
	}

	.error-message {
		background: rgba(239, 68, 68, 0.1);
		color: #dc2626;
		padding: $unit-2x;
		border-radius: $unit;
		border: 1px solid rgba(239, 68, 68, 0.2);
		margin-bottom: $unit-2x;
	}

	.media-grid-container {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		padding: 0 $unit-3x;
	}

	.loading-container {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: $unit-4x;
	}

	.error-retry {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: $unit-2x;
		padding: $unit-4x;

		.error-text {
			color: $gray-40;
			margin: 0;
		}

		.retry-button {
			padding: $unit $unit-2x;
			background: white;
			border: 1px solid $gray-80;
			border-radius: $unit;
			color: $gray-20;
			font-size: 0.875rem;
			cursor: pointer;
			transition: all 0.2s ease;

			&:hover {
				background: $gray-95;
				border-color: $gray-70;
			}
		}
	}

	.modal-footer {
		position: sticky;
		bottom: 0;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: $unit-3x;
		padding: $unit-3x $unit-4x $unit-4x;
		border-top: 1px solid $gray-85;
		background: white;
		z-index: $z-index-dropdown;
		box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
	}

	.action-summary {
		font-size: 0.875rem;
		color: $gray-30;
		flex: 1;
	}

	.action-buttons {
		display: flex;
		gap: $unit-2x;
	}

	// Match search input font size to select dropdowns
	:global(.search-input .input) {
		font-size: 13px !important;
	}

	// Hide the infinite scroll intersection target
	:global(.infinite-intersection-target) {
		height: 0 !important;
		margin: 0 !important;
		padding: 0 !important;
		visibility: hidden;
	}
</style>
