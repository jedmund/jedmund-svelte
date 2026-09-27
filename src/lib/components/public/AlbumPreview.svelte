<script lang="ts">
	import SmartImage from '$components/SmartImage.svelte'
	import type { PublicAlbum } from '$lib/public/types'
	let { album }: { album: PublicAlbum } = $props()
	// Format date
	const formatDate = (dateString?: string) => {
		if (!dateString) return null
		const date = new Date(dateString)
		return date.toLocaleDateString('en-US', {
			month: 'long',
			year: 'numeric'
		})
	}
</script>

<a href="/albums/{album.slug}" class="album-card">
	{#if album.coverPhoto}
		<div class="album-cover">
			<SmartImage
				media={{
					url: album.coverPhoto.url,
					thumbnailUrl: album.coverPhoto.thumbnailUrl ?? null,
					width: album.coverPhoto.width ?? null,
					height: album.coverPhoto.height ?? null,
					dominantColor: album.coverPhoto.dominantColor ?? null,
					colors: album.coverPhoto.colors ?? null,
					aspectRatio: album.coverPhoto.aspectRatio ?? null
				} as import('@prisma/client').Media}
				alt={album.title}
				loading="lazy"
			/>
		</div>
	{:else}
		<div class="album-cover empty">
			<div class="empty-icon">📷</div>
		</div>
	{/if}

	<div class="album-info">
		<h2 class="album-title">{album.title}</h2>

		{#if album.description}
			<p class="album-description">{album.description}</p>
		{/if}

		<div class="album-meta">
			{#if album.date}
				<span class="meta-item">{formatDate(album.date)}</span>
			{/if}
			{#if album.location}
				<span class="meta-item">📍 {album.location}</span>
			{/if}
			<span class="meta-item">{album.photoCount} photos</span>
			{#if album.hasContent}
				<span class="meta-item story-indicator">📖 Story</span>
			{/if}
		</div>
	</div>
</a>

<style lang="scss">
	.album-card {
		display: block;
		text-decoration: none;
		color: inherit;
		background: $gray-100;
		border-radius: $card-corner-radius;
		overflow: hidden;
		transition: all 0.3s ease;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

		&:hover {
			transform: translateY(-2px);
			box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);

			.album-cover {
				:global(img) {
					transform: scale(1.05);
				}
			}
		}
	}

	.album-cover {
		position: relative;
		aspect-ratio: 4 / 3;
		overflow: hidden;
		background: $gray-95;

		:global(img) {
			width: 100%;
			height: 100%;
			object-fit: cover;
			transition: transform 0.3s ease;
		}

		&.empty {
			display: flex;
			align-items: center;
			justify-content: center;
			background: $gray-95;

			.empty-icon {
				font-size: 3rem;
				opacity: 0.3;
			}
		}
	}

	.album-info {
		padding: $unit-3x;

		@include breakpoint('phone') {
			padding: $unit-2x;
		}
	}

	.album-title {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0 0 $unit;
		color: $gray-10;

		@include breakpoint('phone') {
			font-size: 1.125rem;
		}
	}

	.album-description {
		font-size: 0.875rem;
		color: $gray-40;
		margin: 0 0 $unit-2x;
		line-height: 1.5;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.album-meta {
		display: flex;
		flex-wrap: wrap;
		gap: $unit-2x;
		font-size: 0.8125rem;
		color: $gray-50;

		.meta-item {
			display: flex;
			align-items: center;
			gap: $unit-half;

			&.story-indicator {
				color: $blue-50;
				font-weight: 500;
			}
		}
	}
</style>
