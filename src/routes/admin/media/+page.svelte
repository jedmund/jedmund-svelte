<script lang="ts">
	import { onMount } from 'svelte'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import Input from '$lib/components/admin/Input.svelte'
	import MediaDetailsModal from '$lib/components/admin/MediaDetailsModal.svelte'
	import type { Media } from '@prisma/client'

	let media = $state<Media[]>([])
	let isLoading = $state(true)
	let error = $state('')
	let currentPage = $state(1)
	let totalPages = $state(1)
	let total = $state(0)
	let viewMode = $state<'grid' | 'list'>('grid')

	// Filter states
	let filterType = $state<string>('all')
	let searchQuery = $state('')
	let searchTimeout: ReturnType<typeof setTimeout>

	// Modal states
	let selectedMedia = $state<Media | null>(null)
	let isDetailsModalOpen = $state(false)

	onMount(async () => {
		await loadMedia()
	})

	// Watch for search query changes with debounce
	$effect(() => {
		if (searchQuery !== undefined) {
			clearTimeout(searchTimeout)
			searchTimeout = setTimeout(() => {
				handleSearch()
			}, 300)
		}
	})

	async function loadMedia(page = 1) {
		try {
			isLoading = true
			const auth = localStorage.getItem('admin_auth')
			if (!auth) return

			let url = `/api/media?page=${page}&limit=24`
			if (filterType !== 'all') {
				url += `&mimeType=${filterType}`
			}
			if (searchQuery) {
				url += `&search=${encodeURIComponent(searchQuery)}`
			}

			const response = await fetch(url, {
				headers: { Authorization: `Basic ${auth}` }
			})

			if (!response.ok) throw new Error('Failed to load media')

			const data = await response.json()
			media = data.media
			currentPage = data.pagination.page
			totalPages = data.pagination.totalPages
			total = data.pagination.total
		} catch (err) {
			error = 'Failed to load media'
			console.error(err)
		} finally {
			isLoading = false
		}
	}

	function handlePageChange(page: number) {
		loadMedia(page)
	}

	function handleFilterChange() {
		currentPage = 1
		loadMedia(1)
	}

	function handleSearch() {
		currentPage = 1
		loadMedia(1)
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

	function handleMediaClick(item: Media) {
		selectedMedia = item
		isDetailsModalOpen = true
	}

	function handleModalClose() {
		selectedMedia = null
		isDetailsModalOpen = false
	}

	function handleMediaUpdate(updatedMedia: Media) {
		// Update the media item in the list
		const index = media.findIndex(m => m.id === updatedMedia.id)
		if (index !== -1) {
			media[index] = updatedMedia
		}
	}
</script>

<AdminPage>
	<header slot="header">
		<h1>Media Library</h1>
		<div class="header-actions">
			<button
				onclick={() => (viewMode = viewMode === 'grid' ? 'list' : 'grid')}
				class="btn btn-secondary"
			>
				{viewMode === 'grid' ? '📋' : '🖼️'}
				{viewMode === 'grid' ? 'List' : 'Grid'}
			</button>
			<a href="/admin/media/upload" class="btn btn-primary">Upload Media</a>
		</div>
	</header>

	{#if error}
		<div class="error">{error}</div>
	{:else}
		<div class="media-controls">
			<div class="media-stats">
				<div class="stat">
					<span class="stat-value">{total}</span>
					<span class="stat-label">Total files</span>
				</div>
			</div>

			<div class="filters">
				<select bind:value={filterType} onchange={handleFilterChange} class="filter-select">
					<option value="all">All types</option>
					<option value="image">Images</option>
					<option value="video">Videos</option>
					<option value="audio">Audio</option>
					<option value="application/pdf">PDFs</option>
				</select>

				<Input
					type="search"
					bind:value={searchQuery}
					onkeydown={(e) => e.key === 'Enter' && handleSearch()}
					placeholder="Search files..."
					size="small"
					fullWidth={false}
					prefixIcon
					wrapperClass="search-input-wrapper"
				>
					<svg slot="prefix" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
						<path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
					</svg>
				</Input>
			</div>
		</div>

		{#if isLoading}
			<div class="loading">Loading media...</div>
		{:else if media.length === 0}
			<div class="empty-state">
				<p>No media files found.</p>
				<a href="/admin/media/upload" class="btn btn-primary">Upload your first file</a>
			</div>
		{:else if viewMode === 'grid'}
			<div class="media-grid">
				{#each media as item}
					<button 
						class="media-item" 
						type="button"
						onclick={() => handleMediaClick(item)}
						title="Click to edit {item.filename}"
					>
						{#if item.mimeType.startsWith('image/')}
							<img src={item.mimeType === 'image/svg+xml' ? item.url : (item.thumbnailUrl || item.url)} alt={item.altText || item.filename} />
						{:else}
							<div class="file-placeholder">
								<span class="file-type">{getFileType(item.mimeType)}</span>
							</div>
						{/if}
						<div class="media-info">
							<span class="filename">{item.filename}</span>
							<span class="filesize">{formatFileSize(item.size)}</span>
							{#if item.altText}
								<span class="alt-text" title="Alt text: {item.altText}">
									Alt: {item.altText.length > 30 ? item.altText.substring(0, 30) + '...' : item.altText}
								</span>
							{:else}
								<span class="no-alt-text">No alt text</span>
							{/if}
						</div>
					</button>
				{/each}
			</div>
		{:else}
			<div class="media-list">
				{#each media as item}
					<button 
						class="media-row" 
						type="button"
						onclick={() => handleMediaClick(item)}
						title="Click to edit {item.filename}"
					>
						<div class="media-preview">
							{#if item.mimeType.startsWith('image/')}
								<img src={item.mimeType === 'image/svg+xml' ? item.url : (item.thumbnailUrl || item.url)} alt={item.altText || item.filename} />
							{:else}
								<div class="file-icon">{getFileType(item.mimeType)}</div>
							{/if}
						</div>
						<div class="media-details">
							<span class="filename">{item.filename}</span>
							<span class="file-meta">
								{getFileType(item.mimeType)} • {formatFileSize(item.size)}
								{#if item.width && item.height}
									• {item.width}×{item.height}px
								{/if}
							</span>
							{#if item.altText}
								<span class="alt-text-preview">
									Alt: {item.altText}
								</span>
							{:else}
								<span class="no-alt-text-preview">No alt text</span>
							{/if}
						</div>
						<div class="media-indicator">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
							</svg>
						</div>
					</button>
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
	{/if}
</AdminPage>

<!-- Media Details Modal -->
<MediaDetailsModal
	bind:isOpen={isDetailsModalOpen}
	media={selectedMedia}
	onClose={handleModalClose}
	onUpdate={handleMediaUpdate}
/>

<style lang="scss">
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;

		h1 {
			font-size: 1.75rem;
			font-weight: 700;
			margin: 0;
			color: $grey-10;
		}
	}

	.header-actions {
		display: flex;
		gap: $unit-2x;
	}

	.btn {
		padding: $unit-2x $unit-3x;
		border-radius: 50px;
		text-decoration: none;
		font-size: 0.925rem;
		transition: all 0.2s ease;
		border: none;
		cursor: pointer;

		&.btn-primary {
			background-color: $grey-10;
			color: white;

			&:hover {
				background-color: $grey-20;
			}
		}

		&.btn-secondary {
			background-color: $grey-95;
			color: $grey-20;

			&:hover {
				background-color: $grey-90;
				color: $grey-10;
			}
		}
	}

	.error {
		text-align: center;
		padding: $unit-6x;
		color: #d33;
	}

	.media-controls {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: $unit-4x;
		margin-bottom: $unit-4x;
		flex-wrap: wrap;
	}

	.media-stats {
		.stat {
			display: flex;
			flex-direction: column;
			gap: $unit-half;

			.stat-value {
				font-size: 1.5rem;
				font-weight: 700;
				color: $grey-10;
				}

			.stat-label {
				font-size: 0.875rem;
				color: $grey-40;
				}
		}
	}

	.filters {
		display: flex;
		gap: $unit-2x;
		align-items: center;
	}

	.filter-select {
		padding: $unit $unit-3x;
		border: 1px solid $grey-80;
		border-radius: 50px;
		background: white;
		font-size: 0.925rem;
		color: $grey-20;
		cursor: pointer;

		&:focus {
			outline: none;
			border-color: $grey-40;
		}
	}

	.search-input-wrapper {
		width: 240px;

		:global(.input) {
			border-radius: 50px;
		}
	}

	.loading {
		text-align: center;
		padding: $unit-6x;
		color: $grey-40;
	}

	.empty-state {
		text-align: center;
		padding: $unit-8x;
		color: $grey-40;

		p {
			margin-bottom: $unit-3x;
		}
	}

	.media-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: $unit-3x;
		margin-bottom: $unit-4x;
	}

	.media-item {
		background: $grey-95;
		border: none;
		border-radius: $unit-2x;
		overflow: hidden;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: left;
		width: 100%;
		padding: 0;

		&:hover {
			background-color: $grey-90;
			transform: translateY(-2px);
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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

		.file-placeholder {
			width: 100%;
			height: 150px;
			display: flex;
			align-items: center;
			justify-content: center;
			background: $grey-90;

			.file-type {
				font-size: 0.875rem;
				color: $grey-40;
				}
		}

		.media-info {
			padding: $unit-2x;
			display: flex;
			flex-direction: column;
			gap: $unit-half;

			.filename {
				font-size: 0.875rem;
				color: $grey-20;
					white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}

			.filesize {
				font-size: 0.75rem;
				color: $grey-40;
			}

			.alt-text {
				font-size: 0.75rem;
				color: $grey-30;
				font-style: italic;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}

			.no-alt-text {
				font-size: 0.75rem;
				color: $red-60;
				font-style: italic;
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
		background: $grey-95;
		border: none;
		border-radius: $unit-2x;
		transition: all 0.2s ease;
		cursor: pointer;
		text-align: left;
		width: 100%;

		&:hover {
			background-color: $grey-90;
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
				background: $grey-90;
				border-radius: $unit;
				font-size: 0.75rem;
				color: $grey-40;
				}
		}

		.media-details {
			flex: 1;
			display: flex;
			flex-direction: column;
			gap: $unit-half;

			.filename {
				font-size: 0.925rem;
				color: $grey-20;
				font-weight: 500;
			}

			.file-meta {
				font-size: 0.75rem;
				color: $grey-40;
			}

			.alt-text-preview {
				font-size: 0.75rem;
				color: $grey-30;
				font-style: italic;
			}

			.no-alt-text-preview {
				font-size: 0.75rem;
				color: $red-60;
				font-style: italic;
			}
		}

		.media-indicator {
			color: $grey-50;
			flex-shrink: 0;
		}

		.media-actions {
			display: flex;
			gap: $unit;

			.action-btn {
				padding: $unit $unit-2x;
				background: transparent;
				border: 1px solid $grey-80;
				border-radius: 50px;
				font-size: 0.75rem;
					color: $grey-30;
				cursor: pointer;
				transition: all 0.2s ease;

				&:hover {
					border-color: $grey-40;
					color: $grey-10;
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
			background: $grey-95;
			border: none;
			border-radius: 50px;
			color: $grey-20;
			font-size: 0.875rem;
			cursor: pointer;
			transition: all 0.2s ease;

			&:hover:not(:disabled) {
				background: $grey-90;
				color: $grey-10;
			}

			&:disabled {
				opacity: 0.5;
				cursor: not-allowed;
			}
		}

		.pagination-info {
			font-size: 0.875rem;
			color: $grey-40;
		}
	}
</style>
