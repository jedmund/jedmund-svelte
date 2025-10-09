<script lang="ts">
	import { onMount } from 'svelte'
	import Button from './Button.svelte'
	import Input from './Input.svelte'
	import LoadingSpinner from './LoadingSpinner.svelte'

	interface Album {
		id: number
		title: string
		slug: string
		_count?: {
			media: number
		}
	}

	interface Props {
		mediaId: number
		currentAlbums: Album[]
		onUpdate: (albums: Album[]) => void
		onClose: () => void
	}

	let { mediaId, currentAlbums = [], onUpdate, onClose }: Props = $props()

	// State
	let albums = $state<Album[]>([])
	let filteredAlbums = $state<Album[]>([])
	let selectedAlbumIds = $state<Set<number>>(new Set(currentAlbums.map((a) => a.id)))
	let isLoading = $state(true)
	let isSaving = $state(false)
	let error = $state('')
	let searchQuery = $state('')
	let showCreateNew = $state(false)
	let newAlbumTitle = $state('')
	let newAlbumSlug = $state('')

	onMount(() => {
		loadAlbums()
	})

	$effect(() => {
		if (searchQuery) {
			filteredAlbums = albums.filter((album) =>
				album.title.toLowerCase().includes(searchQuery.toLowerCase())
			)
		} else {
			filteredAlbums = albums
		}
	})

	$effect(() => {
		if (newAlbumTitle) {
			// Auto-generate slug from title
			newAlbumSlug = newAlbumTitle
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-|-$/g, '')
		}
	})

	async function loadAlbums() {
		try {
			isLoading = true

			const response = await fetch('/api/albums', {
				credentials: 'same-origin'
			})

			if (!response.ok) {
				throw new Error('Failed to load albums')
			}

			const data = await response.json()
			albums = data.albums || []
			filteredAlbums = albums
		} catch (err) {
			console.error('Failed to load albums:', err)
			error = 'Failed to load albums'
		} finally {
			isLoading = false
		}
	}

	function toggleAlbum(albumId: number) {
		if (selectedAlbumIds.has(albumId)) {
			selectedAlbumIds.delete(albumId)
		} else {
			selectedAlbumIds.add(albumId)
		}
		selectedAlbumIds = new Set(selectedAlbumIds)
	}

	async function createNewAlbum() {
		if (!newAlbumTitle.trim() || !newAlbumSlug.trim()) return

		try {
			isSaving = true
			error = ''

			const response = await fetch('/api/albums', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					title: newAlbumTitle.trim(),
					slug: newAlbumSlug.trim(),
					isPhotography: true,
					status: 'draft'
				}),
				credentials: 'same-origin'
			})

			if (!response.ok) {
				const errorData = await response.json()
				throw new Error(errorData.message || 'Failed to create album')
			}

			const newAlbum = await response.json()

			// Add to albums list and select it
			albums = [newAlbum, ...albums]
			selectedAlbumIds.add(newAlbum.id)
			selectedAlbumIds = new Set(selectedAlbumIds)

			// Reset form
			showCreateNew = false
			newAlbumTitle = ''
			newAlbumSlug = ''
			searchQuery = ''
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create album'
		} finally {
			isSaving = false
		}
	}

	async function handleSave() {
		try {
			isSaving = true
			error = ''

			// Get the list of albums to add/remove
			const currentAlbumIds = new Set(currentAlbums.map((a) => a.id))
			const albumsToAdd = Array.from(selectedAlbumIds).filter((id) => !currentAlbumIds.has(id))
			const albumsToRemove = currentAlbums
				.filter((a) => !selectedAlbumIds.has(a.id))
				.map((a) => a.id)

			// Add to new albums
			for (const albumId of albumsToAdd) {
				const response = await fetch(`/api/albums/${albumId}/media`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ mediaIds: [mediaId] }),
					credentials: 'same-origin'
				})

				if (!response.ok) {
					throw new Error('Failed to add to album')
				}
			}

			// Remove from albums
			for (const albumId of albumsToRemove) {
				const response = await fetch(`/api/albums/${albumId}/media`, {
					method: 'DELETE',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ mediaIds: [mediaId] }),
					credentials: 'same-origin'
				})

				if (!response.ok) {
					throw new Error('Failed to remove from album')
				}
			}

			// Get updated album list
			const updatedAlbums = albums.filter((a) => selectedAlbumIds.has(a.id))
			onUpdate(updatedAlbums)
			onClose()
		} catch (err) {
			console.error('Failed to update albums:', err)
			error = 'Failed to update albums'
		} finally {
			isSaving = false
		}
	}

	// Computed
	const hasChanges = $derived(() => {
		const currentIds = new Set(currentAlbums.map((a) => a.id))
		if (currentIds.size !== selectedAlbumIds.size) return true
		for (const id of selectedAlbumIds) {
			if (!currentIds.has(id)) return true
		}
		return false
	})
</script>

<div class="album-selector">
	<div class="selector-header">
		<h3>Manage Albums</h3>
	</div>

	{#if error}
		<div class="error-message">{error}</div>
	{/if}

	<div class="selector-content">
		{#if !showCreateNew}
			<div class="search-section">
				<Input type="search" bind:value={searchQuery} placeholder="Search albums..." fullWidth />
				<Button variant="ghost" onclick={() => (showCreateNew = true)} buttonSize="small">
					<svg slot="icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
						<path
							d="M8 3v10M3 8h10"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
						/>
					</svg>
					New Album
				</Button>
			</div>

			{#if isLoading}
				<div class="loading-state">
					<LoadingSpinner />
					<p>Loading albums...</p>
				</div>
			{:else if filteredAlbums.length === 0}
				<div class="empty-state">
					<p>{searchQuery ? 'No albums found' : 'No albums available'}</p>
				</div>
			{:else}
				<div class="album-grid">
					{#each filteredAlbums as album}
						<label class="album-option">
							<input
								type="checkbox"
								checked={selectedAlbumIds.has(album.id)}
								onchange={() => toggleAlbum(album.id)}
							/>
							<div class="album-info">
								<span class="album-title">{album.title}</span>
								<span class="album-meta">
									{album._count?.media || 0} photos
								</span>
							</div>
						</label>
					{/each}
				</div>
			{/if}
		{:else}
			<div class="create-new-form">
				<h4>Create New Album</h4>
				<Input
					label="Album Title"
					bind:value={newAlbumTitle}
					placeholder="My New Album"
					fullWidth
				/>
				<Input label="URL Slug" bind:value={newAlbumSlug} placeholder="my-new-album" fullWidth />
				<div class="form-actions">
					<Button
						variant="ghost"
						onclick={() => {
							showCreateNew = false
							newAlbumTitle = ''
							newAlbumSlug = ''
						}}
						disabled={isSaving}
					>
						Cancel
					</Button>
					<Button
						variant="primary"
						onclick={createNewAlbum}
						disabled={!newAlbumTitle.trim() || !newAlbumSlug.trim() || isSaving}
					>
						{isSaving ? 'Creating...' : 'Create Album'}
					</Button>
				</div>
			</div>
		{/if}
	</div>

	{#if !showCreateNew}
		<div class="selector-footer">
			<Button variant="ghost" onclick={onClose}>Cancel</Button>
			<Button variant="primary" onclick={handleSave} disabled={!hasChanges() || isSaving}>
				{isSaving ? 'Saving...' : 'Save Changes'}
			</Button>
		</div>
	{/if}
</div>

<style lang="scss">
	.album-selector {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: white;
		border-radius: $unit-2x;
		overflow: hidden;
	}

	.selector-header {
		padding: $unit-3x;
		border-bottom: 1px solid $gray-85;

		h3 {
			margin: 0;
			font-size: 1.125rem;
			font-weight: 600;
			color: $gray-10;
		}
	}

	.error-message {
		margin: $unit-2x $unit-3x 0;
		padding: $unit-2x;
		background: $error-bg;
		color: $error-text;
		border-radius: $unit;
		font-size: 0.875rem;
	}

	.selector-content {
		flex: 1;
		padding: $unit-3x;
		overflow-y: auto;
		min-height: 0;
	}

	.search-section {
		display: flex;
		gap: $unit-2x;
		margin-bottom: $unit-3x;
	}

	.loading-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: $unit-6x;
		text-align: center;
		color: $gray-40;

		p {
			margin: $unit-2x 0 0 0;
		}
	}

	.album-grid {
		display: flex;
		flex-direction: column;
		gap: $unit;
	}

	.album-option {
		display: flex;
		align-items: center;
		gap: $unit-2x;
		padding: $unit-2x;
		background: $gray-95;
		border-radius: $unit;
		cursor: pointer;
		transition: background 0.2s ease;

		&:hover {
			background: $gray-90;
		}

		input[type='checkbox'] {
			cursor: pointer;
			flex-shrink: 0;
		}
	}

	.album-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.album-title {
		font-size: 0.875rem;
		font-weight: 500;
		color: $gray-10;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.album-meta {
		font-size: 0.75rem;
		color: $gray-40;
	}

	.create-new-form {
		display: flex;
		flex-direction: column;
		gap: $unit-3x;

		h4 {
			margin: 0;
			font-size: 1rem;
			font-weight: 600;
			color: $gray-10;
		}
	}

	.form-actions {
		display: flex;
		gap: $unit-2x;
		justify-content: flex-end;
	}

	.selector-footer {
		display: flex;
		justify-content: flex-end;
		gap: $unit-2x;
		padding: $unit-3x;
		border-top: 1px solid $gray-85;
	}
</style>
