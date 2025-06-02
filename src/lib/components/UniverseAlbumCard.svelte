<script lang="ts">
	import UniverseIcon from '$icons/universe.svg'
	import Slideshow from './Slideshow.svelte'
	import type { UniverseItem } from '../../routes/api/universe/+server'

	let { album }: { album: UniverseItem } = $props()

	const formatDate = (dateString: string) => {
		const date = new Date(dateString)
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		})
	}

	// Convert photos to slideshow items
	const slideshowItems = $derived(
		album.photos && album.photos.length > 0 
			? album.photos.map(photo => ({
				url: photo.url,
				thumbnailUrl: photo.thumbnailUrl,
				caption: photo.caption,
				alt: photo.caption || album.title
			}))
			: album.coverPhoto 
				? [{
					url: album.coverPhoto.url,
					thumbnailUrl: album.coverPhoto.thumbnailUrl,
					caption: album.coverPhoto.caption,
					alt: album.coverPhoto.caption || album.title
				}]
				: []
	)
</script>

<article class="universe-album-card">
	<div class="card-content">
		<div class="card-header">
			<div class="album-type-badge">Album</div>
			<time class="album-date" datetime={album.publishedAt}>
				{formatDate(album.publishedAt)}
			</time>
		</div>

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
			<h2 class="album-title">
				<a href="/photos/{album.slug}" class="album-title-link">{album.title}</a>
			</h2>

			{#if album.location || album.date}
				<div class="album-meta">
					{#if album.date}
						<span class="album-meta-item">📅 {formatDate(album.date)}</span>
					{/if}
					{#if album.location}
						<span class="album-meta-item">📍 {album.location}</span>
					{/if}
				</div>
			{/if}

			{#if album.description}
				<p class="album-description">{album.description}</p>
			{/if}
		</div>

		<div class="card-footer">
			<a href="/photos/{album.slug}" class="view-album"> View album → </a>
			<UniverseIcon class="universe-icon" />
		</div>
	</div>
</article>

<style lang="scss">
	.universe-album-card {
		width: 100%;
		max-width: 700px;
		margin: 0 auto;
	}

	.card-content {
		padding: $unit-4x;
		background: $grey-100;
		border-radius: $card-corner-radius;
		border: 1px solid $grey-95;
		transition: all 0.2s ease;

		&:hover {
			border-color: $grey-85;
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
		}
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: $unit-3x;
	}

	.album-type-badge {
		background: #22c55e;
		color: white;
		padding: $unit-half $unit-2x;
		border-radius: 50px;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.album-date {
		font-size: 0.875rem;
		color: $grey-40;
		font-weight: 400;
	}

	.album-slideshow {
		position: relative;
		width: 100%;
		margin-bottom: $unit-3x;
	}

	.album-info {
		margin-bottom: $unit-3x;
	}

	.album-title {
		margin: 0 0 $unit-2x;
		font-size: 1.375rem;
		font-weight: 600;
		line-height: 1.3;
	}

	.album-title-link {
		color: $grey-10;
		text-decoration: none;
		transition: all 0.2s ease;

		&:hover {
			color: #22c55e;
			text-decoration: underline;
			text-decoration-style: wavy;
			text-underline-offset: 0.15em;
		}
	}

	.album-meta {
		display: flex;
		flex-wrap: wrap;
		gap: $unit-2x;
		margin-bottom: $unit-2x;

		.album-meta-item {
			font-size: 0.875rem;
			color: $grey-40;
			display: flex;
			align-items: center;
			gap: $unit-half;
		}
	}

	.album-description {
		margin: 0;
		color: $grey-20;
		font-size: 1rem;
		line-height: 1.5;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
		overflow: hidden;
	}

	.card-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: $unit-2x;
		border-top: 1px solid $grey-90;
	}

	.view-album {
		color: #22c55e;
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.2s ease;

		&:hover {
			text-decoration: underline;
			text-decoration-style: wavy;
			text-underline-offset: 0.15em;
		}
	}

	:global(.universe-icon) {
		width: 16px;
		height: 16px;
		fill: $grey-40;
	}
</style>
