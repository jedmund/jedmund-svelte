<script lang="ts">
	import UniversePostCard from './UniversePostCard.svelte'
	import UniverseAlbumCard from './UniverseAlbumCard.svelte'
	import UniverseGardenCard from './UniverseGardenCard.svelte'
	import LoadingSpinner from '$components/admin/LoadingSpinner.svelte'
	import { InfiniteLoader, LoaderState } from 'svelte-infinite'
	import type { UniverseItem } from '../../routes/api/universe/+server'

	interface Pagination {
		total: number
		limit: number
		offset: number
		hasMore: boolean
	}

	let {
		items,
		pagination = null,
		tags = ''
	}: { items: UniverseItem[]; pagination?: Pagination | null; tags?: string } = $props()

	const loaderState = new LoaderState()

	let allItems = $state<UniverseItem[]>(items || [])
	let currentOffset = $state(pagination?.limit || 20)
	let loadedKeys = $state(new Set((items || []).map((item) => `${item.type}-${item.id}`)))

	async function loadMore() {
		try {
			const params = new URLSearchParams({ limit: '20', offset: String(currentOffset) })
			if (tags) params.set('tags', tags)

			const response = await fetch(`/api/universe?${params}`)
			if (!response.ok) {
				throw new Error(`Failed to fetch universe feed: ${response.statusText}`)
			}

			const data = await response.json()
			const newItems = (data.items || []).filter(
				(item: UniverseItem) => !loadedKeys.has(`${item.type}-${item.id}`)
			)

			newItems.forEach((item: UniverseItem) => loadedKeys.add(`${item.type}-${item.id}`))
			allItems = [...allItems, ...newItems]
			currentOffset += data.pagination?.limit || 20

			if (!data.pagination?.hasMore || newItems.length === 0) {
				loaderState.complete()
			} else {
				loaderState.loaded()
			}
		} catch (err) {
			console.error('Error loading more universe items:', err)
			loaderState.error()
		}
	}

	let hasInitialized = false
	$effect(() => {
		if (!hasInitialized) {
			hasInitialized = true
			if (!pagination?.hasMore) {
				loaderState.complete()
			}
		}
	})
</script>

<div class="universe-feed">
	{#if allItems && allItems.length > 0}
		{#each allItems as item (`${item.type}-${item.id}`)}
			{#if item.type === 'post'}
				<UniversePostCard post={item} />
			{:else if item.type === 'album'}
				<UniverseAlbumCard album={item} />
			{:else if item.type === 'garden'}
				<UniverseGardenCard garden={item} />
			{/if}
		{/each}

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
				<div class="loader-message">
					<p>Couldn't load more posts.</p>
					<button type="button" onclick={() => loadMore()}>Try again</button>
				</div>
			{/snippet}

			{#snippet noData()}
				<div class="loader-message end-message">You've reached the end</div>
			{/snippet}
		</InfiniteLoader>
	{:else}
		<div class="empty-container">
			<div class="empty-message">
				<h2>No posts yet</h2>
				<p>Posts will be added to Universe soon</p>
			</div>
		</div>
	{/if}
</div>

<style lang="scss">
	.universe-feed {
		display: flex;
		flex-direction: column;
		gap: $unit-2x;
		padding: 0 $unit-2x;
	}

	.loading-container {
		display: flex;
		justify-content: center;
		padding: $unit-4x 0;
	}

	.loader-message {
		text-align: center;
		padding: $unit-3x 0;
		color: $gray-40;
		font-size: 0.925rem;

		p {
			margin: 0 0 $unit;
		}

		button {
			background: none;
			border: none;
			color: $gray-30;
			text-decoration: underline;
			cursor: pointer;
			font-size: inherit;
		}
	}

	.end-message {
		color: $gray-50;
	}

	.empty-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 60vh;
	}

	.empty-message {
		text-align: center;
		max-width: 500px;

		h2 {
			font-size: 1.5rem;
			font-weight: 600;
			margin: 0 0 $unit-2x;
			color: $gray-10;
		}

		p {
			margin: 0;
			color: $gray-40;
			line-height: 1.5;
		}
	}
</style>
