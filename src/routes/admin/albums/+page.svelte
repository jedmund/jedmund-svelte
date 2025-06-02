<script lang="ts">
	import { goto } from '$app/navigation'
	import { onMount } from 'svelte'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import AdminHeader from '$lib/components/admin/AdminHeader.svelte'
	import DataTable from '$lib/components/admin/DataTable.svelte'
	import Button from '$lib/components/admin/Button.svelte'
	import Select from '$lib/components/admin/Select.svelte'
	import LoadingSpinner from '$lib/components/admin/LoadingSpinner.svelte'

	// State
	let albums = $state<any[]>([])
	let isLoading = $state(true)
	let error = $state('')
	let total = $state(0)
	let albumTypeCounts = $state<Record<string, number>>({})

	// Filter state
	let photographyFilter = $state<string>('all')

	// Filter options
	const filterOptions = [
		{ value: 'all', label: 'All albums' },
		{ value: 'true', label: 'Photography albums' },
		{ value: 'false', label: 'Regular albums' }
	]

	const columns = [
		{
			key: 'title',
			label: 'Title',
			width: '40%',
			render: (album: any) => {
				return album.title || '(Untitled Album)'
			}
		},
		{
			key: 'type',
			label: 'Type',
			width: '20%',
			render: (album: any) => {
				const baseType = '🖼️ Album'
				if (album.isPhotography) {
					return `${baseType} 📸`
				}
				return baseType
			}
		},
		{
			key: 'photoCount',
			label: 'Photos',
			width: '15%',
			render: (album: any) => {
				return album._count?.photos || 0
			}
		},
		{
			key: 'status',
			label: 'Status',
			width: '15%',
			render: (album: any) => {
				return album.status === 'published' ? '🟢 Published' : '⚪ Draft'
			}
		},
		{
			key: 'updatedAt',
			label: 'Updated',
			width: '10%',
			render: (album: any) => {
				return new Date(album.updatedAt).toLocaleDateString()
			}
		}
	]

	onMount(async () => {
		await loadAlbums()
	})

	async function loadAlbums() {
		try {
			isLoading = true
			const auth = localStorage.getItem('admin_auth')
			if (!auth) {
				goto('/admin/login')
				return
			}

			let url = '/api/albums'
			if (photographyFilter !== 'all') {
				url += `?isPhotography=${photographyFilter}`
			}

			const response = await fetch(url, {
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
		} catch (err) {
			error = 'Failed to load albums'
			console.error(err)
		} finally {
			isLoading = false
		}
	}

	function handleRowClick(album: any) {
		goto(`/admin/albums/${album.id}/edit`)
	}

	function handleFilterChange() {
		loadAlbums()
	}

	function handleNewAlbum() {
		goto('/admin/albums/new')
	}
</script>

<AdminPage>
	<AdminHeader title="Albums" slot="header">
		{#snippet actions()}
			<Button variant="primary" size="large" onclick={handleNewAlbum}>New Album</Button>
		{/snippet}
	</AdminHeader>

	{#if error}
		<div class="error">{error}</div>
	{:else}
		<!-- Filters -->
		<div class="filters">
			<Select
				bind:value={photographyFilter}
				options={filterOptions}
				size="small"
				variant="minimal"
				onchange={handleFilterChange}
			/>
		</div>

		<!-- Albums Table -->
		{#if isLoading}
			<div class="loading-container">
				<LoadingSpinner />
			</div>
		{:else}
			<DataTable
				data={albums}
				{columns}
				loading={isLoading}
				emptyMessage="No albums found. Create your first album!"
				onRowClick={handleRowClick}
			/>
		{/if}
	{/if}
</AdminPage>

<style lang="scss">
	@import '$styles/variables.scss';


	.error {
		background: rgba(239, 68, 68, 0.1);
		color: #dc2626;
		padding: $unit-3x;
		border-radius: $unit-2x;
		border: 1px solid rgba(239, 68, 68, 0.2);
		margin-bottom: $unit-4x;
	}

	.filters {
		display: flex;
		gap: $unit-2x;
		align-items: center;
		margin-bottom: $unit-4x;
	}

	.loading-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 400px;
	}
</style>
