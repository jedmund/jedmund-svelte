<script lang="ts">
	import Modal from './Modal.svelte'
	import AdminFilters from './AdminFilters.svelte'
	import Select from './Select.svelte'
	import Input from './Input.svelte'
	import Button from './Button.svelte'
	import LoadingSpinner from './LoadingSpinner.svelte'
	import SmartImage from '../SmartImage.svelte'
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
	let selectedMedia = $state<Media[]>([])
	let media = $state<Media[]>([])
	let isSaving = $state(false)
	let error = $state('')
	let currentPage = $state(1)
	let totalPages = $state(1)
	let total = $state(0)

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

	const canConfirm = $derived(selectedMedia.length > 0 && (!showInAlbumMode || albumId))
	const mediaCount = $derived(selectedMedia.length)

	const footerText = $derived(
		showInAlbumMode && canConfirm
			? `Add ${mediaCount} ${mediaCount === 1 ? 'photo' : 'photos'} to album`
			: mode === 'single'
				? canConfirm
					? '1 item selected'
					: 'No item selected'
				: `${mediaCount} item${mediaCount !== 1 ? 's' : ''} selected`
	)

	// State for preventing flicker
	let isInitialLoad = $state(true)

	// Reset state when modal opens
	$effect(() => {
		if (isOpen) {
			selectedMedia = []
			// Don't clear media immediately - let new data replace old
			currentPage = 1
			isInitialLoad = true
			loaderState.reset()
			loadMedia(1)

			// Initialize selected media from IDs if provided
			if (selectedIds.length > 0) {
				// Will be populated when media loads
			}
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

	// Initialize selected media from IDs when media loads
	$effect(() => {
		if (selectedIds.length > 0 && media.length > 0) {
			const preselected = media.filter((item) => selectedIds.includes(item.id))
			if (preselected.length > 0) {
				selectedMedia = [...selectedMedia, ...preselected]
			}
		}
	})

	async function loadMedia(page = currentPage) {
		try {
			// Short delay to prevent flicker
			await new Promise((resolve) => setTimeout(resolve, 500))

			const auth = localStorage.getItem('admin_auth')
			if (!auth) return

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

			const response = await fetch(url, {
				headers: { Authorization: `Basic ${auth}` }
			})

			if (!response.ok) {
				throw new Error('Failed to load media')
			}

			const data = await response.json()

			if (page === 1) {
				// Only clear media after we have new data to prevent flash
				media = data.media
				isInitialLoad = false
			} else {
				media = [...media, ...data.media]
			}

			currentPage = page
			totalPages = data.pagination.totalPages
			total = data.pagination.total

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
		if (mode === 'single') {
			selectedMedia = [item]
		} else {
			const isSelected = selectedMedia.some((m) => m.id === item.id)

			if (isSelected) {
				selectedMedia = selectedMedia.filter((m) => m.id !== item.id)
			} else {
				selectedMedia = [...selectedMedia, item]
			}
		}
	}

	function isSelected(item: Media): boolean {
		return selectedMedia.some((m) => m.id === item.id)
	}

	async function handleConfirm() {
		if (!canConfirm) return

		// If in album mode, save to album
		if (showInAlbumMode && albumId) {
			try {
				isSaving = true
				error = ''
				const auth = localStorage.getItem('admin_auth')
				if (!auth) return

				const mediaIds = selectedMedia.map((m) => m.id)

				const response = await fetch(`/api/albums/${albumId}/media`, {
					method: 'POST',
					headers: {
						Authorization: `Basic ${auth}`,
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ mediaIds })
				})

				if (!response.ok) {
					throw new Error('Failed to add media to album')
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
			if (mode === 'single') {
				onSelect?.(selectedMedia[0])
			} else {
				onSelect?.(selectedMedia)
			}

			handleClose()
		}
	}

	function handleClose() {
		selectedMedia = []
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
					<svg
						width="20"
						height="20"
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
			{#if isInitialLoad && media.length === 0}
				<!-- Loading skeleton -->
				<div class="media-grid">
					{#each Array(12) as _, i}
						<div class="media-item skeleton" aria-hidden="true">
							<div class="media-thumbnail skeleton-bg"></div>
						</div>
					{/each}
				</div>
			{:else if media.length === 0 && currentPage === 1}
				<div class="empty-state">
					<svg
						width="64"
						height="64"
						viewBox="0 0 24 24"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<rect
							x="3"
							y="5"
							width="18"
							height="14"
							rx="2"
							stroke="currentColor"
							stroke-width="2"
						/>
						<circle cx="8.5" cy="8.5" r=".5" fill="currentColor" />
						<path d="M3 16l5-5 3 3 4-4 4 4" stroke="currentColor" stroke-width="2" fill="none" />
					</svg>
					<h3>No media found</h3>
					<p>
						{#if fileType !== 'all'}
							Try adjusting your filters or search
						{:else}
							Try adjusting your search or filters
						{/if}
					</p>
				</div>
			{:else}
				<div class="media-grid">
					{#each media as item, i (item.id)}
						<button
							type="button"
							class="media-item"
							class:selected={isSelected(item)}
							onclick={() => handleMediaClick(item)}
						>
							<!-- Thumbnail -->
							<div
								class="media-thumbnail"
								class:is-svg={item.mimeType === 'image/svg+xml'}
								style="background-color: {item.mimeType === 'image/svg+xml'
									? 'transparent'
									: item.dominantColor || '#f5f5f5'}"
							>
								{#if item.mimeType?.startsWith('image/')}
									<SmartImage
										media={item}
										alt={item.filename}
										loading={i < 8 ? 'eager' : 'lazy'}
										class="media-image {item.mimeType === 'image/svg+xml' ? 'svg-image' : ''}"
										containerWidth={150}
									/>
								{:else}
									<div class="media-placeholder">
										<svg
											width="32"
											height="32"
											viewBox="0 0 24 24"
											fill="none"
											xmlns="http://www.w3.org/2000/svg"
										>
											<rect
												x="5"
												y="3"
												width="14"
												height="18"
												rx="2"
												stroke="currentColor"
												stroke-width="2"
												fill="none"
											/>
											<path
												d="M9 7H15M9 11H15M9 15H13"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
											/>
										</svg>
									</div>
								{/if}

								<!-- Hover Overlay -->
								<div class="hover-overlay"></div>

								<!-- Selected Indicator -->
								{#if isSelected(item)}
									<div class="selected-indicator">
										<svg
											width="18"
											height="18"
											viewBox="0 0 24 24"
											fill="none"
											xmlns="http://www.w3.org/2000/svg"
										>
											<path
												d="M7 13l3 3 7-7"
												stroke="white"
												stroke-width="3"
												stroke-linecap="round"
												stroke-linejoin="round"
											/>
										</svg>
									</div>
								{/if}
							</div>
						</button>
					{/each}
				</div>

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
			{/if}
		</div>

		<!-- Footer -->
		<div class="modal-footer">
			<div class="action-summary">
				<span>{footerText}</span>
			</div>
			<div class="action-buttons">
				<Button variant="ghost" onclick={handleCancel}>Cancel</Button>
				<Button variant="primary" onclick={handleConfirm} disabled={!canConfirm || isSaving}>
					{#if isSaving}
						<LoadingSpinner buttonSize="small" />
						{showInAlbumMode ? 'Adding...' : 'Selecting...'}
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

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: $unit-6x;
		text-align: center;
		color: $gray-40;
		min-height: 400px;

		svg {
			color: $gray-70;
			margin-bottom: $unit-2x;
		}

		h3 {
			margin: 0 0 $unit 0;
			font-size: 1.25rem;
			font-weight: 600;
			color: $gray-30;
		}

		p {
			margin: 0;
			color: $gray-50;
		}
	}

	.media-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: $unit-2x;
		padding: $unit-3x 0;
	}

	.media-item {
		position: relative;
		aspect-ratio: 1;
		background: $gray-95;
		border: none;
		border-radius: $unit-2x;
		overflow: hidden;
		cursor: pointer;
		transition: all 0.2s ease;
		padding: 0;

		&:hover .hover-overlay {
			opacity: 1;
		}
	}

	.media-thumbnail {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
		transition: background-color 0.3s ease;

		:global(.media-image) {
			width: 100%;
			height: 100%;
			object-fit: cover;
			animation: fadeIn 0.3s ease-in-out;
		}

		&.is-svg {
			padding: $unit-2x;
			box-sizing: border-box;
			background-color: $gray-95 !important;

			:global(.svg-image) {
				object-fit: contain !important;
			}
		}
	}

	.media-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: $gray-60;
	}

	.hover-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(255, 255, 255, 0.1);
		opacity: 0;
		transition: opacity 0.2s ease;
		pointer-events: none;
	}

	.selected-indicator {
		position: absolute;
		top: $unit;
		right: $unit;
		width: 28px;
		height: 28px;
		background: $blue-50;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
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

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	// Skeleton loader styles
	.skeleton {
		pointer-events: none;
		cursor: default;
	}

	.skeleton-bg {
		background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
		background-size: 200% 100%;
		animation: shimmer 1.5s infinite;
	}

	@keyframes shimmer {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}

	.media-image-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: $unit;
		text-align: center;
		font-size: 0.75rem;
		color: $gray-50;
		word-break: break-word;
	}

	// Hide the infinite scroll intersection target
	:global(.infinite-intersection-target) {
		height: 0 !important;
		margin: 0 !important;
		padding: 0 !important;
		visibility: hidden;
	}
</style>
