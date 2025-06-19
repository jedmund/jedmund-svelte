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
				const mediaId = item.id.replace(/^(media|photo)-/, '') // Support both prefixes
				goto(`/photos/${albumSlug}/${mediaId}`)
			} else {
				// Navigate to individual photo page using the media ID
				const mediaId = item.id.replace(/^(media|photo)-/, '') // Support both prefixes
				goto(`/photos/p/${mediaId}`)
			}
		}
	}

	function handleImageLoad() {
		imageLoaded = true
	}

	const photo = $derived(isAlbum(item) ? item.coverPhoto : item)
	const isAlbumItem = $derived(isAlbum(item))
	const placeholderStyle = $derived(
		photo.dominantColor 
			? `background: ${photo.dominantColor}` 
			: ''
	)
	const aspectRatioStyle = $derived(
		photo.aspectRatio 
			? `aspect-ratio: ${photo.aspectRatio}` 
			: ''
	)
</script>

<div class="photo-item" class:is-album={isAlbumItem}>
	<button class="photo-button" onclick={handleClick} type="button">
		{#if isAlbumItem}
			<!-- Stack effect for albums -->
			<div class="album-stack">
				<div class="stack-photo stack-back"></div>
				<div class="stack-photo stack-middle"></div>
				<div class="stack-photo stack-front" style={aspectRatioStyle}>
					<img
						src={photo.src}
						alt={photo.alt}
						loading="lazy"
						draggable="false"
						onload={handleImageLoad}
						class:loaded={imageLoaded}
					/>
					<div class="image-placeholder" style={placeholderStyle} class:loaded={imageLoaded}></div>
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
			<div class="single-photo" style={aspectRatioStyle}>
				<img
					src={photo.src}
					alt={photo.alt}
					loading="lazy"
					draggable="false"
					onload={handleImageLoad}
					class:loaded={imageLoaded}
				/>
				<div class="image-placeholder" style={placeholderStyle} class:loaded={imageLoaded}></div>
			</div>
		{/if}
	</button>
</div>

<style lang="scss">
	.photo-item {
		break-inside: avoid;

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
			position: relative;
			z-index: 2;

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
				position: relative;
				z-index: 2;

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
		background: #f0f0f0; // Lighter default grey
		border-radius: $corner-radius;
		opacity: 1;
		transition: opacity 0.4s ease;
		z-index: 1;
		overflow: hidden;


		&.loaded {
			opacity: 0;
			pointer-events: none;
		}
	}

</style>
