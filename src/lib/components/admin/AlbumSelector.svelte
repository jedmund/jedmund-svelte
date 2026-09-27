<script lang="ts">
	import { untrack } from 'svelte'
	import { createAlbumSession, emptyAlbums } from '$lib/admin/media/album-session'
	import Button from './Button.svelte'
	import CreateAlbumFields from './media/CreateAlbumFields.svelte'
	import Input from './Input.svelte'
	import LoadingSpinner from './LoadingSpinner.svelte'

	import type { AlbumSummary as Album } from '$lib/admin/media/requests'

	interface Props {
		mediaId?: number
		currentAlbums?: Album[]
		onUpdate?: (albums: Album[]) => void | Promise<void>
		onClose?: () => void
		selectedAlbumId?: number | null
		onSelect?: (albumId: number | null) => void | Promise<void>
		placeholder?: string
	}

	let {
		mediaId,
		currentAlbums = [],
		onUpdate,
		onClose,
		selectedAlbumId,
		onSelect,
		placeholder: _placeholder
	}: Props = $props()

	let albumState = $state.raw(emptyAlbums())
	let callbackError = $state('')
	let generation = 0
	let searchQuery = $state('')
	let showCreateNew = $state(false)
	let newAlbumTitle = $state('')
	let newAlbumSlug = $state('')
	const session = createAlbumSession({ onChange: (value) => (albumState = value) })
	const filteredAlbums = $derived(
		albumState.albums.filter((album) =>
			album.title.toLowerCase().includes(searchQuery.toLowerCase())
		)
	)
	const hasChanges = $derived(
		albumState.selected.size !== currentAlbums.length ||
			currentAlbums.some((album) => !albumState.selected.has(album.id))
	)
	$effect(() => {
		const id = mediaId
		generation++
		callbackError = ''
		untrack(() => {
			void session.open(id, currentAlbums)
		})
		return () => {
			generation++
			session.close()
		}
	})
	$effect(() => {
		newAlbumSlug = newAlbumTitle
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '')
	})
	async function createNewAlbum() {
		if (!newAlbumTitle.trim() || !newAlbumSlug.trim()) return
		if (await session.create(newAlbumTitle, newAlbumSlug)) {
			showCreateNew = false
			newAlbumTitle = ''
			newAlbumSlug = ''
			searchQuery = ''
			try {
				await onSelect?.(albumState.albums[0].id)
			} catch (error) {
				callbackError = error instanceof Error ? error.message : 'Unable to select album'
			}
		}
	}
	async function handleSave() {
		const current = generation
		callbackError = ''
		await session.save(async (albums) => {
			await onUpdate?.(albums)
			if (current === generation) onClose?.()
		})
	}
</script>

<div class="album-selector">
	<div class="selector-header">
		<h3>{onSelect ? 'Choose an album' : 'Manage Albums'}</h3>
	</div>

	{#if albumState.error || callbackError}
		<div class="error-message">{albumState.error || callbackError}</div>
	{/if}

	<div class="selector-content">
		{#if !showCreateNew}
			<div class="search-section">
				<Input type="search" bind:value={searchQuery} placeholder="Search albums..." fullWidth />
				<Button variant="ghost" onclick={() => (showCreateNew = true)} buttonSize="small">
					{#snippet icon()}<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
							<path
								d="M8 3v10M3 8h10"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
							/>
						</svg>{/snippet}
					New Album
				</Button>
			</div>

			{#if albumState.loading}
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
								type={onSelect ? 'radio' : 'checkbox'}
								disabled={albumState.saving}
								checked={onSelect
									? selectedAlbumId === album.id
									: albumState.selected.has(album.id)}
								onchange={async () => {
									try {
										if (onSelect) await onSelect(album.id)
										else session.toggle(album.id)
									} catch (error) {
										callbackError =
											error instanceof Error ? error.message : 'Unable to select album'
									}
								}}
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
			<CreateAlbumFields
				bind:title={newAlbumTitle}
				bind:slug={newAlbumSlug}
				saving={albumState.saving}
				onCreate={createNewAlbum}
				onCancel={() => {
					showCreateNew = false
					newAlbumTitle = ''
					newAlbumSlug = ''
				}}
			/>
		{/if}
	</div>

	{#if !showCreateNew && !onSelect}
		<div class="selector-footer">
			<Button variant="ghost" onclick={() => onClose?.()}>Cancel</Button>
			<Button variant="primary" onclick={handleSave} disabled={!hasChanges || albumState.saving}>
				{albumState.saving ? 'Saving...' : 'Save Changes'}
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

	.selector-footer {
		display: flex;
		justify-content: flex-end;
		gap: $unit-2x;
		padding: $unit-3x;
		border-top: 1px solid $gray-85;
	}
</style>
