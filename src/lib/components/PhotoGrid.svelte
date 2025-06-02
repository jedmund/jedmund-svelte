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
</script>

<div class="photo-grid-container">
	<div class="photo-grid">
		{#each photoItems as item}
			<PhotoItem {item} {albumSlug} />
		{/each}
	</div>
</div>

<style lang="scss">
	.photo-grid-container {
		width: 100%;
	}

	.photo-grid {
		columns: 3;
		column-gap: $unit-3x;
		margin: 0;

		@include breakpoint('tablet') {
			columns: 2;
			column-gap: $unit-2x;
		}

		@include breakpoint('phone') {
			columns: 1;
		}
	}
</style>
