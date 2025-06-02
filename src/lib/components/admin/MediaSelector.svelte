<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte'
	import Input from './Input.svelte'
	import Button from './Button.svelte'
	import LoadingSpinner from './LoadingSpinner.svelte'
	import type { Media } from '@prisma/client'

	interface Props {
		mode: 'single' | 'multiple'
		fileType?: 'image' | 'video' | 'all'
		selectedIds?: number[]
		loading?: boolean
	}

	let {
		mode,
		fileType = 'all',
		selectedIds = [],
		loading = $bindable(false)
	}: Props = $props()

	const dispatch = createEventDispatcher<{
		select: Media[]
	}>()

	// State
	let media = $state<Media[]>([])
	let selectedMedia = $state<Media[]>([])
	let currentPage = $state(1)
	let totalPages = $state(1)
	let total = $state(0)
	let searchQuery = $state('')
	let filterType = $state<string>(fileType === 'all' ? 'all' : fileType)
	let photographyFilter = $state<string>('all')
	let searchTimeout: ReturnType<typeof setTimeout>

	// Initialize selected media from IDs
	$effect(() => {
		if (selectedIds.length > 0 && media.length > 0) {
			selectedMedia = media.filter(item => selectedIds.includes(item.id))
			dispatch('select', selectedMedia)
		}
	})

	// Watch for search query changes with debounce
	$effect(() => {
		if (searchQuery !== undefined) {
			clearTimeout(searchTimeout)
			searchTimeout = setTimeout(() => {
				currentPage = 1
				loadMedia()
			}, 300)
		}
	})

	// Watch for filter changes
	$effect(() => {
		if (filterType !== undefined) {
			currentPage = 1
			loadMedia()
		}
	})

	// Watch for photography filter changes
	$effect(() => {
		if (photographyFilter !== undefined) {
			currentPage = 1
			loadMedia()
		}
	})

	onMount(() => {
		loadMedia()
	})

	async function loadMedia(page = 1) {
		try {
			loading = true
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

			const response = await fetch(url, {
				headers: { Authorization: `Basic ${auth}` }
			})

			if (!response.ok) {
				throw new Error('Failed to load media')
			}

			const data = await response.json()
			
			if (page === 1) {
				media = data.media
			} else {
				media = [...media, ...data.media]
			}
			
			currentPage = page
			totalPages = data.pagination.totalPages
			total = data.pagination.total

		} catch (error) {
			console.error('Error loading media:', error)
		} finally {
			loading = false
		}
	}

	function handleMediaClick(item: Media) {
		if (mode === 'single') {
			selectedMedia = [item]
			dispatch('select', selectedMedia)
		} else {
			const isSelected = selectedMedia.some(m => m.id === item.id)
			
			if (isSelected) {
				selectedMedia = selectedMedia.filter(m => m.id !== item.id)
			} else {
				selectedMedia = [...selectedMedia, item]
			}
			
			dispatch('select', selectedMedia)
		}
	}

	function handleSelectAll() {
		if (selectedMedia.length === media.length) {
			selectedMedia = []
		} else {
			selectedMedia = [...media]
		}
		dispatch('select', selectedMedia)
	}

	function loadMore() {
		if (currentPage < totalPages && !loading) {
			loadMedia(currentPage + 1)
		}
	}

	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 B'
		const k = 1024
		const sizes = ['B', 'KB', 'MB', 'GB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
	}

	function isSelected(item: Media): boolean {
		return selectedMedia.some(m => m.id === item.id)
	}

	// Computed properties
	const hasMore = $derived(currentPage < totalPages)
	const showSelectAll = $derived(mode === 'multiple' && media.length > 0)
	const allSelected = $derived(media.length > 0 && selectedMedia.length === media.length)
</script>

<div class="media-selector">
	<!-- Search and Filter Controls -->
	<div class="controls">
		<div class="search-filters">
			<Input
				type="search"
				placeholder="Search media files..."
				bind:value={searchQuery}
			/>
			
			<select bind:value={filterType} class="filter-select">
				<option value="all">All Files</option>
				<option value="image">Images</option>
				<option value="video">Videos</option>
			</select>
			
			<select bind:value={photographyFilter} class="filter-select">
				<option value="all">All Media</option>
				<option value="true">Photography</option>
				<option value="false">Non-Photography</option>
			</select>
		</div>

		{#if showSelectAll}
			<Button variant="ghost" onclick={handleSelectAll}>
				{allSelected ? 'Clear All' : 'Select All'}
			</Button>
		{/if}
	</div>

	<!-- Results Info -->
	{#if total > 0}
		<div class="results-info">
			<span class="total-count">{total} file{total !== 1 ? 's' : ''} found</span>
		</div>
	{/if}

	<!-- Media Grid -->
	<div class="media-grid-container">
		{#if loading && media.length === 0}
			<div class="loading-container">
				<LoadingSpinner />
				<p>Loading media...</p>
			</div>
		{:else if media.length === 0}
			<div class="empty-state">
				<svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="2"/>
					<circle cx="8.5" cy="8.5" r=".5" fill="currentColor"/>
					<path d="M3 16l5-5 3 3 4-4 4 4" stroke="currentColor" stroke-width="2" fill="none"/>
				</svg>
				<h3>No media found</h3>
				<p>Try adjusting your search or upload some files</p>
			</div>
		{:else}
			<div class="media-grid">
				{#each media as item (item.id)}
					<button
						type="button"
						class="media-item"
						class:selected={isSelected(item)}
						onclick={() => handleMediaClick(item)}
					>
						<!-- Thumbnail -->
						<div class="media-thumbnail">
							{#if item.thumbnailUrl}
								<img 
									src={item.thumbnailUrl} 
									alt={item.filename}
									loading="lazy"
								/>
							{:else}
								<div class="media-placeholder">
									<svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
										<rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="2"/>
										<circle cx="8.5" cy="8.5" r=".5" fill="currentColor"/>
										<path d="M3 16l5-5 3 3 4-4 4 4" stroke="currentColor" stroke-width="2" fill="none"/>
									</svg>
								</div>
							{/if}

							<!-- Selection Indicator -->
							{#if mode === 'multiple'}
								<div class="selection-checkbox">
									<input 
										type="checkbox" 
										checked={isSelected(item)}
										readonly
									/>
								</div>
							{/if}

							<!-- Selected Overlay -->
							{#if isSelected(item)}
								<div class="selected-overlay">
									<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
										<path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
									</svg>
								</div>
							{/if}
						</div>

						<!-- Media Info -->
						<div class="media-info">
							<div class="media-filename" title={item.filename}>
								{item.filename}
							</div>
							<div class="media-indicators">
								{#if item.isPhotography}
									<span class="indicator-pill photography" title="Photography">
										<svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
											<polygon points="12,2 15.09,8.26 22,9 17,14.74 18.18,21.02 12,17.77 5.82,21.02 7,14.74 2,9 8.91,8.26" fill="currentColor"/>
										</svg>
										Photo
									</span>
								{/if}
								{#if item.altText}
									<span class="indicator-pill alt-text" title="Alt text: {item.altText}">
										Alt
									</span>
								{:else}
									<span class="indicator-pill no-alt-text" title="No alt text">
										No Alt
									</span>
								{/if}
							</div>
							<div class="media-meta">
								<span class="file-size">{formatFileSize(item.size)}</span>
								{#if item.width && item.height}
									<span class="dimensions">{item.width}×{item.height}</span>
								{/if}
							</div>
						</div>
					</button>
				{/each}
			</div>

			<!-- Load More Button -->
			{#if hasMore}
				<div class="load-more-container">
					<Button 
						variant="ghost" 
						onclick={loadMore} 
						disabled={loading}
						class="load-more-button"
					>
						{#if loading}
							<LoadingSpinner size="small" />
							Loading...
						{:else}
							Load More
						{/if}
					</Button>
				</div>
			{/if}
		{/if}
	</div>
</div>

<style lang="scss">
	.media-selector {
		display: flex;
		flex-direction: column;
		height: 100%;
		padding: $unit-3x $unit-4x;
	}

	.controls {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: $unit-2x;
		margin-bottom: $unit-3x;
		flex-shrink: 0;
	}

	.search-filters {
		display: flex;
		gap: $unit-2x;
		flex: 1;
		max-width: 600px;
	}

	.filter-select {
		padding: $unit $unit-2x;
		border: 1px solid $grey-80;
		border-radius: $card-corner-radius;
		background-color: white;
		font-size: 0.875rem;
		min-width: 120px;

		&:focus {
			outline: none;
			border-color: $blue-60;
			box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
		}
	}

	.results-info {
		margin-bottom: $unit-2x;
		flex-shrink: 0;
	}

	.total-count {
		font-size: 0.875rem;
		color: $grey-30;
	}

	.media-grid-container {
		flex: 1;
		overflow-y: auto;
		min-height: 0;
	}

	.loading-container,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: $unit-6x;
		text-align: center;
		color: $grey-40;
		min-height: 300px;

		svg {
			margin-bottom: $unit-2x;
			color: $grey-60;
		}

		h3 {
			margin: 0 0 $unit 0;
			font-size: 1.125rem;
			font-weight: 600;
			color: $grey-20;
		}

		p {
			margin: 0;
			font-size: 0.875rem;
		}
	}

	.media-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: $unit-2x;
		padding-bottom: $unit-2x;
	}

	.media-item {
		display: flex;
		flex-direction: column;
		background: white;
		border: 2px solid $grey-90;
		border-radius: $card-corner-radius;
		padding: $unit;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: left;
		width: 100%;

		&:hover {
			border-color: $grey-70;
			transform: translateY(-1px);
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		}

		&.selected {
			border-color: $blue-60;
			background-color: rgba(59, 130, 246, 0.05);
		}

		&:focus {
			outline: none;
			border-color: $blue-60;
			box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
		}
	}

	.media-thumbnail {
		position: relative;
		width: 100%;
		height: 120px;
		border-radius: calc($card-corner-radius - 2px);
		overflow: hidden;
		background-color: $grey-95;
		margin-bottom: $unit;

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}
	}

	.media-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		color: $grey-60;
		background-color: $grey-95;
	}

	.selection-checkbox {
		position: absolute;
		top: $unit;
		left: $unit;
		z-index: 2;

		input {
			width: 18px;
			height: 18px;
			cursor: pointer;
		}
	}

	.selected-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(59, 130, 246, 0.2);
		display: flex;
		align-items: center;
		justify-content: center;
		color: $blue-60;
	}

	.media-info {
		flex: 1;
	}

	.media-filename {
		font-size: 0.875rem;
		font-weight: 500;
		color: $grey-10;
		margin-bottom: $unit-half;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.media-indicators {
		display: flex;
		gap: $unit-half;
		flex-wrap: wrap;
		margin-bottom: $unit-half;
	}

	.media-meta {
		display: flex;
		gap: $unit;
		font-size: 0.75rem;
		color: $grey-40;
	}

	// Indicator pill styles
	.indicator-pill {
		display: inline-flex;
		align-items: center;
		gap: $unit-half;
		padding: 2px $unit;
		border-radius: 4px;
		font-size: 0.625rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		line-height: 1;

		svg {
			width: 8px;
			height: 8px;
			flex-shrink: 0;
		}

		&.photography {
			background-color: rgba(139, 92, 246, 0.1);
			color: #7c3aed;
			border: 1px solid rgba(139, 92, 246, 0.2);

			svg {
				fill: #7c3aed;
			}
		}

		&.alt-text {
			background-color: rgba(34, 197, 94, 0.1);
			color: #16a34a;
			border: 1px solid rgba(34, 197, 94, 0.2);
		}

		&.no-alt-text {
			background-color: rgba(239, 68, 68, 0.1);
			color: #dc2626;
			border: 1px solid rgba(239, 68, 68, 0.2);
		}
	}

	.load-more-container {
		display: flex;
		justify-content: center;
		padding: $unit-3x 0;
	}

	// Responsive adjustments
	@media (max-width: 768px) {
		.media-selector {
			padding: $unit-2x;
		}

		.controls {
			flex-direction: column;
			align-items: stretch;
			gap: $unit-2x;
		}

		.search-filters {
			max-width: none;
		}

		.media-grid {
			grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
			gap: $unit;
		}

		.media-thumbnail {
			height: 100px;
		}
	}
</style>