<script lang="ts">
	import PhotoItem from './PhotoItem.svelte'
	import type { PhotoItem as PhotoItemType } from '$lib/types/photos'
	import { isAlbum } from '$lib/types/photos'

	const {
		photoItems,
		albumSlug
	}: {
		photoItems: PhotoItemType[]
		albumSlug?: string
	} = $props()
</script>

<div class="single-column-grid">
	{#each photoItems as item}
		<div class="photo-container">
			<PhotoItem {item} {albumSlug} />
			{#if !isAlbum(item) && item.caption}
				<div class="photo-details">
					<p class="photo-caption">{item.caption}</p>
				</div>
			{/if}
		</div>
	{/each}
</div>

<style lang="scss">
	.single-column-grid {
		display: flex;
		flex-direction: column;
		gap: $unit-4x;
		width: 100%;
	}

	.photo-container {
		width: 100%;
	}

	.photo-details {
		padding: $unit-2x 0 0;
	}

	.photo-caption {
		margin: 0;
		font-size: 0.9rem;
		line-height: 1.6;
		color: $gray-20;
	}

	@include breakpoint('phone') {
		.single-column-grid {
			gap: $unit-3x;
		}

		.photo-details {
			padding: $unit 0;
		}
	}
</style>
