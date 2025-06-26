<script lang="ts">
	import type { PhotoItem as PhotoItemType } from '$lib/types/photos'
	import { isAlbum } from '$lib/types/photos'
	import { goto } from '$app/navigation'

	const {
		photoItems
	}: {
		photoItems: PhotoItemType[]
	} = $props()

	// Function to determine if an image is ultrawide (aspect ratio > 2:1)
	function isUltrawide(item: PhotoItemType): boolean {
		if (isAlbum(item)) {
			const { width, height } = item.coverPhoto
			return width / height > 2
		} else {
			return item.width / item.height > 2
		}
	}

	// Process items to determine grid placement
	let gridItems = $state<Array<{ item: PhotoItemType; spanFull: boolean }>>([])

	$effect(() => {
		// First, separate ultrawide and regular items
		const ultrawideItems: PhotoItemType[] = []
		const regularItems: PhotoItemType[] = []

		photoItems.forEach((item) => {
			if (isUltrawide(item)) {
				ultrawideItems.push(item)
			} else {
				regularItems.push(item)
			}
		})

		// Build the grid ensuring we fill rows of 3
		const processedItems: Array<{ item: PhotoItemType; spanFull: boolean }> = []
		let regularIndex = 0
		let ultrawideIndex = 0
		let rowsSinceLastUltrawide = 1 // Start with 1 to allow ultrawide at beginning

		while (regularIndex < regularItems.length || ultrawideIndex < ultrawideItems.length) {
			const remainingRegular = regularItems.length - regularIndex
			const remainingUltrawide = ultrawideItems.length - ultrawideIndex

			// Check if we can/should place an ultrawide
			if (
				ultrawideIndex < ultrawideItems.length &&
				rowsSinceLastUltrawide >= 1 &&
				(remainingRegular === 0 || remainingRegular >= 3)
			) {
				// Place ultrawide
				processedItems.push({
					item: ultrawideItems[ultrawideIndex],
					spanFull: true
				})
				ultrawideIndex++
				rowsSinceLastUltrawide = 0
			} else if (regularIndex < regularItems.length && remainingRegular >= 3) {
				// Place a full row of 3 regular photos
				for (let i = 0; i < 3 && regularIndex < regularItems.length; i++) {
					processedItems.push({
						item: regularItems[regularIndex],
						spanFull: false
					})
					regularIndex++
				}
				rowsSinceLastUltrawide++
			} else if (regularIndex < regularItems.length) {
				// Place remaining regular photos (less than 3)
				while (regularIndex < regularItems.length) {
					processedItems.push({
						item: regularItems[regularIndex],
						spanFull: false
					})
					regularIndex++
				}
				rowsSinceLastUltrawide++
			} else {
				// Only ultrawides left, place them with spacing
				if (ultrawideIndex < ultrawideItems.length) {
					processedItems.push({
						item: ultrawideItems[ultrawideIndex],
						spanFull: true
					})
					ultrawideIndex++
				}
			}
		}

		gridItems = processedItems
	})

	function handleClick(item: PhotoItemType) {
		if (isAlbum(item)) {
			// Navigate to album page using the slug
			goto(`/albums/${item.slug}`)
		} else {
			// For individual photos, check if we have album context
			// Always navigate to individual photo page using the media ID
			const mediaId = item.id.replace(/^(media|photo)-/, '') // Support both prefixes
			goto(`/photos/${mediaId}`)
		}
	}

	function getImageSrc(item: PhotoItemType): string {
		return isAlbum(item) ? item.coverPhoto.src : item.src
	}

	function getImageAlt(item: PhotoItemType): string {
		return isAlbum(item) ? item.coverPhoto.alt : item.alt
	}
</script>

<div class="three-column-grid">
	{#each gridItems as { item, spanFull }}
		<button
			class="grid-item"
			class:span-full={spanFull}
			class:is-album={isAlbum(item)}
			onclick={() => handleClick(item)}
			type="button"
		>
			<div class="image-container">
				<img src={getImageSrc(item)} alt={getImageAlt(item)} loading="lazy" draggable="false" />
			</div>
			{#if isAlbum(item)}
				<div class="album-overlay">
					<div class="album-info">
						<span class="album-title">{item.title}</span>
						<span class="album-count">{item.photos.length} photos</span>
					</div>
				</div>
			{/if}
		</button>
	{/each}
</div>

<style lang="scss">
	.three-column-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: $unit-2x;
		width: 100%;
		max-width: 100%;
		box-sizing: border-box;
	}

	.grid-item {
		grid-column: span 1;
		position: relative;
		aspect-ratio: 1; // Square by default
		overflow: hidden;
		border-radius: $corner-radius;
		cursor: pointer;
		background: none;
		border: none;
		padding: 0;
		transition:
			transform 0.2s ease,
			box-shadow 0.2s ease;

		&:hover {
			box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
		}

		&.span-full {
			grid-column: span 3;
			aspect-ratio: 3; // Wider aspect ratio for ultrawide images
		}
	}

	.image-container {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
			display: block;
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
		z-index: $z-index-base;
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

	// Stack effect for albums
	.is-album {
		&::before,
		&::after {
			content: '';
			position: absolute;
			border-radius: $corner-radius;
			background: rgba(0, 0, 0, 0.1);
			z-index: -1;
		}

		&::before {
			top: -3px;
			left: 3px;
			right: -3px;
			bottom: 3px;
			transform: rotate(-1deg);
		}

		&::after {
			top: -6px;
			left: 6px;
			right: -6px;
			bottom: 6px;
			transform: rotate(2deg);
		}

		&:hover {
			&::before {
				transform: rotate(-1.5deg) translateY(-0.5px);
			}

			&::after {
				transform: rotate(3deg) translateY(-1px);
			}
		}
	}

	@include breakpoint('tablet') {
		.three-column-grid {
			grid-template-columns: repeat(2, 1fr);
			gap: $unit;
		}

		.grid-item.span-full {
			grid-column: span 2;
			aspect-ratio: 2; // Adjust aspect ratio for 2-column layout
		}
	}

	@include breakpoint('phone') {
		.three-column-grid {
			grid-template-columns: 1fr;
		}

		.grid-item {
			aspect-ratio: 4/3; // Slightly wider on mobile
		}

		.grid-item.span-full {
			grid-column: span 1;
			aspect-ratio: 16/9; // Standard widescreen on mobile
		}
	}
</style>
