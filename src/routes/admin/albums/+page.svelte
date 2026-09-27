<script lang="ts">
	import { createCollectionSession } from '$lib/admin/collection'
	import { loadAlbums as fetchAlbums, publishAlbum, deleteAlbum } from '$lib/admin/album-requests'
	import { filterAlbums } from '$lib/admin/album-filter'
	import { goto } from '$app/navigation'
	import { onMount, onDestroy } from 'svelte'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import AdminHeader from '$lib/components/admin/AdminHeader.svelte'
	import AdminFilters from '$lib/components/admin/AdminFilters.svelte'
	import AlbumListItem from '$lib/components/admin/AlbumListItem.svelte'
	import DeleteConfirmationModal from '$lib/components/admin/DeleteConfirmationModal.svelte'
	import EmptyState from '$lib/components/admin/EmptyState.svelte'
	import ErrorMessage from '$lib/components/admin/ErrorMessage.svelte'
	import Button from '$lib/components/admin/Button.svelte'
	import Select from '$lib/components/admin/Select.svelte'
	import type { Album } from '$lib/admin/album-types'

	// State
	let albums = $state<Album[]>([])
	let filteredAlbums = $state<Album[]>([])
	let isLoading = $state(true)
	let error = $state('')
	let showDeleteModal = $state(false)
	let albumToDelete = $state<Album | null>(null)
	let activeDropdown = $state<number | null>(null)

	// Filter state
	let statusFilter = $state<string>('all')
	let sortBy = $state<string>('newest')

	// Filter options
	const filterOptions = [
		{ value: 'all', label: 'All albums' },
		{ value: 'published', label: 'Published' },
		{ value: 'draft', label: 'Drafts' }
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

	onMount(() => {
		loadAlbums()
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

	const collection = createCollectionSession<Album>((next, loading, message) => {
		albums = next
		isLoading = loading
		error = message
		applyFilterAndSort()
	})
	onDestroy(() => collection.dispose())
	async function loadAlbums() {
		await collection.load(fetchAlbums)
	}

	function applyFilterAndSort() {
		filteredAlbums = filterAlbums(albums, statusFilter, sortBy)
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
			if (
				await collection.mutate(album.id, (signal) =>
					publishAlbum(album.id, album.status === 'published' ? 'draft' : 'published', signal)
				)
			)
				await loadAlbums()
		} catch (failure) {
			error = failure instanceof Error ? failure.message : 'Failed to update album status'
		}
	}

	function handleDelete(event: CustomEvent<{ album: Album; event: MouseEvent }>) {
		event.detail.event.stopPropagation()
		activeDropdown = null
		albumToDelete = event.detail.album
		showDeleteModal = true
	}

	async function confirmDelete() {
		const album = albumToDelete
		if (!album) return
		try {
			if (await collection.mutate(album.id, (signal) => deleteAlbum(album.id, signal))) {
				await loadAlbums()
				if (albumToDelete?.id === album.id) {
					showDeleteModal = false
					albumToDelete = null
				}
			}
		} catch (failure) {
			error = failure instanceof Error ? failure.message : 'Failed to delete album'
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

<svelte:head>
	<title>Albums - Admin @jedmund</title>
</svelte:head>

<AdminPage>
	{#snippet header()}
		<AdminHeader title="Albums">
			{#snippet actions()}
				<Button variant="primary" buttonSize="medium" onclick={handleNewAlbum}>New album</Button>
			{/snippet}
		</AdminHeader>
	{/snippet}

	{#if error}
		<ErrorMessage message={error} />
	{:else}
		<!-- Filters -->
		<AdminFilters>
			{#snippet left()}
				<Select
					bind:value={statusFilter}
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
			<EmptyState
				title="No albums found"
				message={statusFilter === 'all'
					? 'Create your first album to get started!'
					: 'No albums found matching the current filters. Try adjusting your filters or create a new album.'}
			/>
		{:else}
			<div class="albums-list">
				{#each filteredAlbums as album}
					<AlbumListItem
						{album}
						isDropdownActive={activeDropdown === album.id}
						ontoggledropdown={handleToggleDropdown}
						onedit={handleEdit}
						ontogglepublish={handleTogglePublish}
						ondelete={handleDelete}
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
	.loading {
		padding: $unit-8x;
		text-align: center;
		color: $gray-40;

		.spinner {
			width: calc($unit * 4); // 32px
			height: calc($unit * 4); // 32px
			border: calc($unit / 2 + $unit-1px) solid $gray-80; // 3px
			border-top-color: $gray-40;
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

	.albums-list {
		display: flex;
		flex-direction: column;
	}
</style>
