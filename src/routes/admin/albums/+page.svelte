<script lang="ts">
	import { goto } from '$app/navigation'
	import { onMount } from 'svelte'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import DataTable from '$lib/components/admin/DataTable.svelte'
	import Button from '$lib/components/admin/Button.svelte'
	import LoadingSpinner from '$lib/components/admin/LoadingSpinner.svelte'

	// State
	let albums = $state<any[]>([])
	let isLoading = $state(true)
	let error = $state('')
	let total = $state(0)
	let albumTypeCounts = $state<Record<string, number>>({})

	// Filter state
	let photographyFilter = $state<string>('all')

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
				photography: albums.filter(a => a.isPhotography).length,
				regular: albums.filter(a => !a.isPhotography).length
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
	<header slot="header">
		<h1>Albums</h1>
		<div class="header-actions">
			<Button variant="primary" onclick={handleNewAlbum}>
				New Album
			</Button>
		</div>
	</header>

	{#if error}
		<div class="error">{error}</div>
	{:else}
		<!-- Albums Stats -->
		<div class="albums-stats">
			<div class="stat">
				<span class="stat-value">{albumTypeCounts.all || 0}</span>
				<span class="stat-label">Total albums</span>
			</div>
			<div class="stat">
				<span class="stat-value">{albumTypeCounts.photography || 0}</span>
				<span class="stat-label">Photography albums</span>
			</div>
			<div class="stat">
				<span class="stat-value">{albumTypeCounts.regular || 0}</span>
				<span class="stat-label">Regular albums</span>
			</div>
		</div>

		<!-- Filters -->
		<div class="filters">
			<select bind:value={photographyFilter} onchange={handleFilterChange} class="filter-select">
				<option value="all">All albums</option>
				<option value="true">Photography albums</option>
				<option value="false">Regular albums</option>
			</select>
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
		align-items: center;
	}

	.error {
		background: rgba(239, 68, 68, 0.1);
		color: #dc2626;
		padding: $unit-3x;
		border-radius: $unit-2x;
		border: 1px solid rgba(239, 68, 68, 0.2);
		margin-bottom: $unit-4x;
	}

	.albums-stats {
		display: flex;
		gap: $unit-4x;
		margin-bottom: $unit-4x;
		padding: $unit-4x;
		background: $grey-95;
		border-radius: $unit-2x;

		.stat {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: $unit-half;

			.stat-value {
				font-size: 2rem;
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
		margin-bottom: $unit-4x;
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

	.loading-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 400px;
	}
</style>