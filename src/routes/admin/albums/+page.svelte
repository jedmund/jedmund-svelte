<script lang="ts">
	import { goto } from '$app/navigation'
	import { onMount } from 'svelte'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import AdminHeader from '$lib/components/admin/AdminHeader.svelte'
	import AdminFilters from '$lib/components/admin/AdminFilters.svelte'
	import AlbumListItem from '$lib/components/admin/AlbumListItem.svelte'
	import DeleteConfirmationModal from '$lib/components/admin/DeleteConfirmationModal.svelte'
	import Button from '$lib/components/admin/Button.svelte'
	import Select from '$lib/components/admin/Select.svelte'

	interface Photo {
		id: number
		url: string
		thumbnailUrl: string | null
		caption: string | null
	}

	interface Album {
		id: number
		slug: string
		title: string
		description: string | null
		date: string | null
		location: string | null
		coverPhotoId: number | null
		isPhotography: boolean
		status: string
		showInUniverse: boolean
		publishedAt: string | null
		createdAt: string
		updatedAt: string
		photos: Photo[]
		_count: {
			photos: number
		}
	}

	// State
	let albums = $state<Album[]>([])
	let filteredAlbums = $state<Album[]>([])
	let isLoading = $state(true)
	let error = $state('')
	let total = $state(0)
	let albumTypeCounts = $state<Record<string, number>>({})
	let showDeleteModal = $state(false)
	let albumToDelete = $state<Album | null>(null)
	let activeDropdown = $state<number | null>(null)

	// Filter state
	let photographyFilter = $state<string>('all')
	let sortBy = $state<string>('newest')

	// Filter options
	const filterOptions = [
		{ value: 'all', label: 'All albums' },
		{ value: 'true', label: 'Photography albums' },
		{ value: 'false', label: 'Regular albums' }
	]

	const sortOptions = [
		{ value: 'newest', label: 'Newest first' },
		{ value: 'oldest', label: 'Oldest first' },
		{ value: 'title-asc', label: 'Title (A-Z)' },
		{ value: 'title-desc', label: 'Title (Z-A)' },
		{ value: 'date-desc', label: 'Date (newest)' },
		{ value: 'date-asc', label: 'Date (oldest)' },
		{ value: 'status-published', label: 'Published first' },
		{ value: 'status-draft', label: 'Draft first' }
	]

	onMount(async () => {
		await loadAlbums()
		// Close dropdown when clicking outside
		document.addEventListener('click', handleOutsideClick)
		return () => document.removeEventListener('click', handleOutsideClick)
	})

	function handleOutsideClick(event: MouseEvent) {
		const target = event.target as HTMLElement
		if (!target.closest('.dropdown-container')) {
			activeDropdown = null
		}
	}

	async function loadAlbums() {
		try {
			const auth = localStorage.getItem('admin_auth')
			if (!auth) {
				goto('/admin/login')
				return
			}

			const response = await fetch('/api/albums', {
				headers: { Authorization: `Basic ${auth}` }
			})

			if (!response.ok) {
				if (response.status === 401) {
					goto('/admin/login')
					return
				}
				throw new Error('Failed to load albums')
			}

			const data = await response.json()
			albums = data.albums || []
			total = data.pagination?.total || albums.length

			// Calculate album type counts
			const counts: Record<string, number> = {
				all: albums.length,
				photography: albums.filter((a) => a.isPhotography).length,
				regular: albums.filter((a) => !a.isPhotography).length
			}
			albumTypeCounts = counts

			// Apply initial filter and sort
			applyFilterAndSort()
		} catch (err) {
			error = 'Failed to load albums'
			console.error(err)
		} finally {
			isLoading = false
		}
	}

	function applyFilterAndSort() {
		let filtered = [...albums]

		// Apply filter
		if (photographyFilter === 'true') {
			filtered = filtered.filter((album) => album.isPhotography === true)
		} else if (photographyFilter === 'false') {
			filtered = filtered.filter((album) => album.isPhotography === false)
		}

		// Apply sorting
		switch (sortBy) {
			case 'oldest':
				filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
				break
			case 'title-asc':
				filtered.sort((a, b) => a.title.localeCompare(b.title))
				break
			case 'title-desc':
				filtered.sort((a, b) => b.title.localeCompare(a.title))
				break
			case 'date-desc':
				filtered.sort((a, b) => {
					if (!a.date && !b.date) return 0
					if (!a.date) return 1
					if (!b.date) return -1
					return new Date(b.date).getTime() - new Date(a.date).getTime()
				})
				break
			case 'date-asc':
				filtered.sort((a, b) => {
					if (!a.date && !b.date) return 0
					if (!a.date) return 1
					if (!b.date) return -1
					return new Date(a.date).getTime() - new Date(b.date).getTime()
				})
				break
			case 'status-published':
				filtered.sort((a, b) => {
					if (a.status === b.status) return 0
					return a.status === 'published' ? -1 : 1
				})
				break
			case 'status-draft':
				filtered.sort((a, b) => {
					if (a.status === b.status) return 0
					return a.status === 'draft' ? -1 : 1
				})
				break
			case 'newest':
			default:
				filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
				break
		}

		filteredAlbums = filtered
	}

	function handleToggleDropdown(event: CustomEvent<{ albumId: number; event: MouseEvent }>) {
		event.detail.event.stopPropagation()
		activeDropdown = activeDropdown === event.detail.albumId ? null : event.detail.albumId
	}

	function handleEdit(event: CustomEvent<{ album: Album; event: MouseEvent }>) {
		event.detail.event.stopPropagation()
		goto(`/admin/albums/${event.detail.album.id}/edit`)
	}

	async function handleTogglePublish(event: CustomEvent<{ album: Album; event: MouseEvent }>) {
		event.detail.event.stopPropagation()
		activeDropdown = null

		const album = event.detail.album

		try {
			const auth = localStorage.getItem('admin_auth')
			const newStatus = album.status === 'published' ? 'draft' : 'published'

			const response = await fetch(`/api/albums/${album.id}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Basic ${auth}`
				},
				body: JSON.stringify({ status: newStatus })
			})

			if (response.ok) {
				await loadAlbums()
			}
		} catch (err) {
			console.error('Failed to update album status:', err)
		}
	}

	function handleDelete(event: CustomEvent<{ album: Album; event: MouseEvent }>) {
		event.detail.event.stopPropagation()
		activeDropdown = null
		albumToDelete = event.detail.album
		showDeleteModal = true
	}

	async function confirmDelete() {
		if (!albumToDelete) return

		try {
			const auth = localStorage.getItem('admin_auth')

			const response = await fetch(`/api/albums/${albumToDelete.id}`, {
				method: 'DELETE',
				headers: { Authorization: `Basic ${auth}` }
			})

			if (response.ok) {
				await loadAlbums()
			} else {
				const errorData = await response.json()
				error = errorData.error || 'Failed to delete album'
			}
		} catch (err) {
			console.error('Failed to delete album:', err)
			error = 'Failed to delete album. Please try again.'
		} finally {
			showDeleteModal = false
			albumToDelete = null
		}
	}

	function cancelDelete() {
		showDeleteModal = false
		albumToDelete = null
	}

	function handleFilterChange() {
		applyFilterAndSort()
	}

	function handleSortChange() {
		applyFilterAndSort()
	}

	function handleNewAlbum() {
		goto('/admin/albums/new')
	}
</script>

<AdminPage>
	<AdminHeader title="Albums" slot="header">
		{#snippet actions()}
			<Button variant="primary" buttonSize="large" onclick={handleNewAlbum}>New Album</Button>
		{/snippet}
	</AdminHeader>

	{#if error}
		<div class="error">{error}</div>
	{:else}
		<!-- Filters -->
		<AdminFilters>
			{#snippet left()}
				<Select
					bind:value={photographyFilter}
					options={filterOptions}
					size="small"
					variant="minimal"
					onchange={handleFilterChange}
				/>
			{/snippet}
			{#snippet right()}
				<Select
					bind:value={sortBy}
					options={sortOptions}
					size="small"
					variant="minimal"
					onchange={handleSortChange}
				/>
			{/snippet}
		</AdminFilters>

		<!-- Albums List -->
		{#if isLoading}
			<div class="loading">
				<div class="spinner"></div>
				<p>Loading albums...</p>
			</div>
		{:else if filteredAlbums.length === 0}
			<div class="empty-state">
				<p>
					{#if photographyFilter === 'all'}
						No albums found. Create your first album!
					{:else}
						No albums found matching the current filters. Try adjusting your filters or create a new
						album.
					{/if}
				</p>
			</div>
		{:else}
			<div class="albums-list">
				{#each filteredAlbums as album}
					<AlbumListItem
						{album}
						isDropdownActive={activeDropdown === album.id}
						on:toggleDropdown={handleToggleDropdown}
						on:edit={handleEdit}
						on:togglePublish={handleTogglePublish}
						on:delete={handleDelete}
					/>
				{/each}
			</div>
		{/if}
	{/if}
</AdminPage>

<DeleteConfirmationModal
	bind:isOpen={showDeleteModal}
	title="Delete album?"
	message={albumToDelete
		? `Are you sure you want to delete "${albumToDelete.title}"? The album will be deleted but all photos will remain in your media library. This action cannot be undone.`
		: ''}
	onConfirm={confirmDelete}
	onCancel={cancelDelete}
/>

<style lang="scss">
	.error {
		text-align: center;
		padding: $unit-6x;
		color: #d33;
	}

	.loading {
		padding: $unit-8x;
		text-align: center;
		color: $grey-40;

		.spinner {
			width: 32px;
			height: 32px;
			border: 3px solid $grey-80;
			border-top-color: $grey-40;
			border-radius: 50%;
			margin: 0 auto $unit-2x;
			animation: spin 0.8s linear infinite;
		}

		p {
			margin: 0;
		}
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.empty-state {
		padding: $unit-8x;
		text-align: center;
		color: $grey-40;

		p {
			margin: 0;
		}
	}

	.albums-list {
		display: flex;
		flex-direction: column;
	}
</style>
