<script lang="ts">
	import UniverseCard from './UniverseCard.svelte'
	import Slideshow from './Slideshow.svelte'
	import type { UniverseItem } from '../../routes/api/universe/+server'

	let { album }: { album: UniverseItem } = $props()

	// Convert photos to slideshow items
	const slideshowItems = $derived(
		album.photos && album.photos.length > 0
			? album.photos.map((photo) => ({
					url: photo.url,
					thumbnailUrl: photo.thumbnailUrl,
					caption: photo.caption,
					alt: photo.caption || album.title
				}))
			: album.coverPhoto
				? [
						{
							url: album.coverPhoto.url,
							thumbnailUrl: album.coverPhoto.thumbnailUrl,
							caption: album.coverPhoto.caption,
							alt: album.coverPhoto.caption || album.title
						}
					]
				: []
	)
</script>

<UniverseCard item={album} type="album">
	{#if slideshowItems.length > 0}
		<div class="album-slideshow">
			<Slideshow
				items={slideshowItems}
				alt={album.title}
				aspectRatio="3/2"
				showThumbnails={slideshowItems.length > 1}
				maxThumbnails={6}
				totalCount={album.photosCount}
				showMoreLink="/photos/{album.slug}"
			/>
		</div>
	{/if}

	<div class="album-info">
		<h2 class="card-title">
			<a
				href="/photos/{album.slug}"
				class="card-title-link"
				onclick={(e) => e.preventDefault()}
				tabindex="-1">{album.title}</a
			>
		</h2>

		{#if album.description}
			<p class="album-description">{album.description}</p>
		{/if}
	</div>
</UniverseCard>

<style lang="scss">
	.album-slideshow {
		position: relative;
		width: 100%;
		margin-bottom: $unit-2x;
	}

	.album-info {
		margin-bottom: 0;
	}

	.card-title {
		margin: 0 0 $unit-2x;
		font-size: 1.375rem;
		font-weight: 600;
		line-height: 1.3;
	}

	.card-title-link {
		text-decoration: none;
		transition: all 0.2s ease;
	}

	.album-description {
		margin: 0;
		color: $grey-10;
		font-size: 1.125rem;
		line-height: 1.5;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
		overflow: hidden;
	}
</style>
