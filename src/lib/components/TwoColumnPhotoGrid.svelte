<script lang="ts">
	import PhotoItem from '$components/PhotoItem.svelte'
	import type { PhotoItem as PhotoItemType } from '$lib/types/photos'

	const {
		photoItems,
		albumSlug
	}: {
		photoItems: PhotoItemType[]
		albumSlug?: string
	} = $props()

	// Split items into two columns
	const column1 = $derived(photoItems.filter((_, index) => index % 2 === 0))
	const column2 = $derived(photoItems.filter((_, index) => index % 2 === 1))
</script>

<div class="two-column-grid">
	<div class="column">
		{#each column1 as item}
			<PhotoItem {item} {albumSlug} />
		{/each}
	</div>
	<div class="column">
		{#each column2 as item}
			<PhotoItem {item} {albumSlug} />
		{/each}
	</div>
</div>

<style lang="scss">
	.two-column-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: $unit-3x;

		@include breakpoint('phone') {
			gap: $unit-2x;
		}
	}

	.column {
		display: flex;
		flex-direction: column;
		gap: $unit-3x;

		@include breakpoint('phone') {
			gap: $unit-2x;
		}
	}
</style>
