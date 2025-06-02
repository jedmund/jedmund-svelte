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
		<div class="empty-state">
			<p>No content found in the universe yet.</p>
		</div>
	{/if}
</div>

<style lang="scss">
	.universe-feed {
		display: flex;
		flex-direction: column;
		gap: $unit-4x;
	}

	.empty-state {
		text-align: center;
		padding: $unit-6x $unit-3x;
		color: $grey-40;

		p {
			margin: 0;
			font-size: 1.125rem;
		}
	}
</style>
