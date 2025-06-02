<script lang="ts">
	import type { PhotoItem, Photo, PhotoAlbum } from '$lib/types/photos'
	import { isAlbum } from '$lib/types/photos'
	import { goto } from '$app/navigation'

	const {
		item,
		albumSlug // For when this is used within an album context
	}: {
		item: PhotoItem
		albumSlug?: string
	} = $props()

	let imageLoaded = $state(false)

	function handleClick() {
		if (isAlbum(item)) {
			// Navigate to album page using the slug
			goto(`/photos/${item.slug}`)
		} else {
			// For individual photos, check if we have album context
			if (albumSlug) {
				// Navigate to photo within album
				const photoId = item.id.replace('photo-', '') // Remove 'photo-' prefix
				goto(`/photos/${albumSlug}/${photoId}`)
			} else {
				// For standalone photos, navigate to a generic photo page (to be implemented)
				console.log('Individual photo navigation not yet implemented')
			}
		}
	}

	function handleImageLoad() {
		imageLoaded = true
	}

	const photo = $derived(isAlbum(item) ? item.coverPhoto : item)
	const isAlbumItem = $derived(isAlbum(item))
</script>

<div class="photo-item" class:is-album={isAlbumItem}>
	<button class="photo-button" onclick={handleClick} type="button">
		{#if isAlbumItem}
			<!-- Stack effect for albums -->
			<div class="album-stack">
				<div class="stack-photo stack-back"></div>
				<div class="stack-photo stack-middle"></div>
				<div class="stack-photo stack-front">
					<img
						src={photo.src}
						alt={photo.alt}
						loading="lazy"
						draggable="false"
						onload={handleImageLoad}
						class:loaded={imageLoaded}
					/>
					{#if !imageLoaded}
						<div class="image-placeholder"></div>
					{/if}
				</div>
				<div class="album-overlay">
					<div class="album-info">
						<span class="album-title">{item.title}</span>
						<span class="album-count">{item.photos.length} photos</span>
					</div>
				</div>
			</div>
		{:else}
			<!-- Single photo -->
			<div class="single-photo">
				<img
					src={photo.src}
					alt={photo.alt}
					loading="lazy"
					draggable="false"
					onload={handleImageLoad}
					class:loaded={imageLoaded}
				/>
				{#if !imageLoaded}
					<div class="image-placeholder"></div>
				{/if}
			</div>
		{/if}
	</button>
</div>

<style lang="scss">
	.photo-item {
		break-inside: avoid;
		margin-bottom: $unit-3x;

		@include breakpoint('tablet') {
			margin-bottom: $unit-2x;
		}
	}

	.photo-button {
		display: block;
		width: 100%;
		border: none;
		padding: 0;
		background: none;
		cursor: pointer;
		border-radius: $corner-radius;
		overflow: hidden;
		position: relative;
		transition:
			transform 0.2s ease,
			box-shadow 0.2s ease;

		&:hover {
			transform: translateY(-2px);
			box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
		}

		&:active {
			transform: translateY(0);
		}
	}

	.single-photo {
		width: 100%;
		position: relative;

		img {
			width: 100%;
			height: auto;
			display: block;
			border-radius: $corner-radius;
			opacity: 0;
			transition: opacity 0.4s ease;

			&.loaded {
				opacity: 1;
			}
		}
	}

	.album-stack {
		position: relative;
		width: 100%;
	}

	.stack-photo {
		border-radius: $corner-radius;

		&.stack-back {
			position: absolute;
			top: -6px;
			left: 6px;
			right: -6px;
			height: 100%;
			background: rgba(0, 0, 0, 0.1);
			z-index: 1;
			transform: rotate(2deg);
		}

		&.stack-middle {
			position: absolute;
			top: -3px;
			left: 3px;
			right: -3px;
			height: 100%;
			background: rgba(0, 0, 0, 0.2);
			z-index: 2;
			transform: rotate(-1deg);
		}

		&.stack-front {
			position: relative;
			z-index: 3;

			img {
				width: 100%;
				height: auto;
				display: block;
				border-radius: $corner-radius;
				opacity: 0;
				transition: opacity 0.4s ease;

				&.loaded {
					opacity: 1;
				}
			}
		}
	}

	.album-overlay {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
		color: white;
		padding: $unit-2x;
		z-index: 4;
		border-radius: 0 0 $corner-radius $corner-radius;
	}

	.album-info {
		display: flex;
		flex-direction: column;
		gap: $unit-half;
	}

	.album-title {
		font-weight: 600;
		font-size: 0.9rem;
		line-height: 1.2;
	}

	.album-count {
		font-size: 0.75rem;
		opacity: 0.9;
	}

	.is-album {
		.photo-button:hover {
			.stack-back {
				transform: rotate(3deg) translateY(-1px);
			}

			.stack-middle {
				transform: rotate(-1.5deg) translateY(-0.5px);
			}
		}
	}

	.image-placeholder {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 50%, #f0f0f0 100%);
		background-size: 200% 200%;
		animation: shimmer 1.5s ease-in-out infinite;
		border-radius: $corner-radius;

		&::after {
			content: '';
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			width: 40px;
			height: 40px;
			background: rgba(0, 0, 0, 0.1);
			border-radius: 50%;
			background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='1.5'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpolyline points='21,15 16,10 5,21'/%3E%3C/svg%3E");
			background-repeat: no-repeat;
			background-position: center;
			background-size: 24px 24px;
		}
	}

	@keyframes shimmer {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}
</style>
