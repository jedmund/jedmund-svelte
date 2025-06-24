<script lang="ts">
	import Masonry from 'svelte-bricks'
	import PhotoItem from './PhotoItem.svelte'
	import type { PhotoItem as PhotoItemType } from '$lib/types/photos'

	const {
		photoItems
	}: {
		photoItems: PhotoItemType[]
	} = $props()

	// Responsive column configuration
	// These values work well with our existing design
	let minColWidth = 200 // Minimum column width in px
	let maxColWidth = 400 // Maximum column width in px
	let gap = 16 // Gap between items (equivalent to $unit-2x)

	// On tablet/phone, we want larger minimum widths
	let windowWidth = $state(0)

	$effect(() => {
		// Adjust column widths based on viewport
		if (windowWidth < 768) {
			// Phone: single column
			minColWidth = windowWidth - 48 // Account for padding
			maxColWidth = windowWidth - 48
		} else if (windowWidth < 1024) {
			// Tablet: 2 columns
			minColWidth = 300
			maxColWidth = 500
		} else {
			// Desktop: 3 columns
			minColWidth = 200
			maxColWidth = 400
		}
	})

	// Ensure unique IDs for keyed blocks to prevent shifting
	const getId = (item: PhotoItemType) => item.id
</script>

<svelte:window bind:innerWidth={windowWidth} />

<div class="masonry-container">
	<Masonry
		items={photoItems}
		{minColWidth}
		{maxColWidth}
		{gap}
		{getId}
		animate={false}
		duration={0}
		class="photo-masonry"
	>
		{#snippet children({ item })}
			<PhotoItem {item} />
		{/snippet}
	</Masonry>
</div>

<style lang="scss">
	.masonry-container {
		width: 100%;
	}

	:global(.photo-masonry) {
		width: 100%;
	}
</style>
