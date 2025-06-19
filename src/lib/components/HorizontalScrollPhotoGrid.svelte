<script lang="ts">
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

<div class="horizontal-scroll">
	{#each photoItems as item}
		{#if isAlbum(item)}
			<a href="/photos/{item.slug}" class="photo-link">
				<img src={item.coverPhoto.src} alt={item.title} />
				<p class="caption">{item.title}</p>
			</a>
		{:else}
			{@const mediaId = item.id.replace(/^(media|photo)-/, '')}
			<a href="/photos/{albumSlug ? `${albumSlug}/${mediaId}` : `p/${mediaId}`}" class="photo-link">
				<img src={item.src} alt={item.alt} />
				{#if item.caption}
					<p class="caption">{item.caption}</p>
				{/if}
			</a>
		{/if}
	{/each}
</div>

<style lang="scss">
	.horizontal-scroll {
		display: flex;
		gap: $unit-3x;
		overflow-x: auto;
		overflow-y: hidden;
		padding: 0 $unit-3x;

		// Hide scrollbar
		scrollbar-width: none;
		-ms-overflow-style: none;
		&::-webkit-scrollbar {
			display: none;
		}

		@include breakpoint('phone') {
			gap: $unit-2x;
		}
	}

	.photo-link {
		flex: 0 0 auto;
		display: flex;
		flex-direction: column;
		gap: $unit;
		text-decoration: none;
		color: inherit;

		img {
			height: 60vh;
			width: auto;
			object-fit: contain;
			border-radius: $corner-radius-md;
		}
	}

	.caption {
		margin: 0;
		font-size: 0.875rem;
		line-height: 1.4;
		color: $grey-20;
		padding: $unit 0;
	}
</style>
