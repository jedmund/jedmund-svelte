<script lang="ts">
	import { onMount } from 'svelte'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
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

	onMount(async () => {
		await loadMedia()
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

				<div class="search-wrapper">
					<input
						type="text"
						bind:value={searchQuery}
						onkeydown={(e) => e.key === 'Enter' && handleSearch()}
						placeholder="Search files..."
						class="search-input"
					/>
					<button onclick={handleSearch} class="search-btn">Search</button>
				</div>
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
					<div class="media-item">
						{#if item.mimeType.startsWith('image/')}
							<img src={item.thumbnailUrl || item.url} alt={item.filename} />
						{:else}
							<div class="file-placeholder">
								<span class="file-type">{getFileType(item.mimeType)}</span>
							</div>
						{/if}
						<div class="media-info">
							<span class="filename">{item.filename}</span>
							<span class="filesize">{formatFileSize(item.size)}</span>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="media-list">
				{#each media as item}
					<div class="media-row">
						<div class="media-preview">
							{#if item.mimeType.startsWith('image/')}
								<img src={item.thumbnailUrl || item.url} alt={item.filename} />
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
						</div>
						<div class="media-actions">
							<button class="action-btn">Copy URL</button>
							<button class="action-btn">Delete</button>
						</div>
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
	{/if}
</AdminPage>

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
			font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
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
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
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
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
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
				font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
			}

			.stat-label {
				font-size: 0.875rem;
				color: $grey-40;
				font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
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
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		color: $grey-20;
		cursor: pointer;

		&:focus {
			outline: none;
			border-color: $grey-40;
		}
	}

	.search-wrapper {
		display: flex;
		gap: $unit;
	}

	.search-input {
		padding: $unit $unit-3x;
		border: 1px solid $grey-80;
		border-radius: 50px;
		font-size: 0.925rem;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		width: 200px;

		&:focus {
			outline: none;
			border-color: $grey-40;
		}

		&::placeholder {
			color: $grey-50;
		}
	}

	.search-btn {
		padding: $unit $unit-3x;
		background: $grey-10;
		color: white;
		border: none;
		border-radius: 50px;
		font-size: 0.875rem;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		cursor: pointer;
		transition: background-color 0.2s ease;

		&:hover {
			background-color: $grey-20;
		}
	}

	.loading {
		text-align: center;
		padding: $unit-6x;
		color: $grey-40;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
	}

	.empty-state {
		text-align: center;
		padding: $unit-8x;
		color: $grey-40;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;

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
		border-radius: $unit-2x;
		overflow: hidden;
		cursor: pointer;
		transition: background-color 0.2s ease;

		&:hover {
			background-color: $grey-90;
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
				font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
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
				font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}

			.filesize {
				font-size: 0.75rem;
				color: $grey-40;
				font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
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
		border-radius: $unit-2x;
		transition: background-color 0.2s ease;

		&:hover {
			background-color: $grey-90;
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
				font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
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
				font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
			}

			.file-meta {
				font-size: 0.75rem;
				color: $grey-40;
				font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
			}
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
				font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
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
			font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
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
			font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		}
	}
</style>
