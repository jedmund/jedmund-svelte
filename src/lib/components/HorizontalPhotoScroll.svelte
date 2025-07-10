<script lang="ts">
	import type { Photo } from '$lib/types/photos'

	interface Props {
		photos: Photo[]
		showCaptions?: boolean
	}

	let { photos = [], showCaptions = true }: Props = $props()
</script>

<div class="horizontal-scroll">
	{#each photos as photo}
		{@const mediaId = photo.id.replace(/^(media|photo)-/, '')}
		<a href="/photos/{mediaId}" class="photo-link">
			<img src={photo.src} alt={photo.alt} />
			{#if showCaptions && photo.caption}
				<p class="caption">{photo.caption}</p>
			{/if}
		</a>
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
		color: $gray-20;
		padding: $unit 0;
	}
</style>
