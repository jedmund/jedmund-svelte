<script lang="ts">
	import UniversePostCard from './UniversePostCard.svelte'
	import UniverseAlbumCard from './UniverseAlbumCard.svelte'
	import type { UniverseItem } from '../../routes/api/universe/+server'

	let { items }: { items: UniverseItem[] } = $props()
</script>

<div class="universe-feed">
	{#if items && items.length > 0}
		{#each items as item}
			{#if item.type === 'post'}
				<UniversePostCard post={item} />
			{:else if item.type === 'album'}
				<UniverseAlbumCard album={item} />
			{/if}
		{/each}
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
