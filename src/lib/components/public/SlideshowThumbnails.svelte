<script lang="ts">
	import type { SlideItem } from '$lib/public/slideshow'
	let {
		items,
		alt,
		selectedIndex,
		maxThumbnails,
		totalCount,
		showMoreLink,
		onselect
	}: {
		items: SlideItem[]
		alt: string
		selectedIndex: number
		maxThumbnails?: number
		totalCount?: number
		showMoreLink?: string
		onselect: (index: number) => void
	} = $props()
	let windowWidth = $state(0)

	// Calculate columns based on breakpoints
	const columnsPerRow = $derived(windowWidth <= 400 ? 3 : windowWidth <= 600 ? 4 : 6)

	// Make maxThumbnails responsive - use fewer thumbnails on smaller screens
	const responsiveMaxThumbnails = $derived(
		maxThumbnails ? (windowWidth <= 400 ? 3 : windowWidth <= 600 ? 4 : maxThumbnails) : undefined
	)

	const showMoreThumbnail = $derived(
		responsiveMaxThumbnails && totalCount && totalCount > responsiveMaxThumbnails - 1
	)

	// Determine how many thumbnails to show
	const displayItems = $derived(
		!responsiveMaxThumbnails || !showMoreThumbnail
			? items
			: items.slice(0, responsiveMaxThumbnails - 1) // Show actual thumbnails, leave last slot for "+N"
	)

	const remainingCount = $derived(
		showMoreThumbnail ? (totalCount || items.length) - (responsiveMaxThumbnails! - 1) : 0
	)

	const totalSlots = $derived(
		responsiveMaxThumbnails
			? responsiveMaxThumbnails
			: Math.ceil((displayItems.length + (showMoreThumbnail ? 1 : 0)) / columnsPerRow) *
					columnsPerRow
	)

	// Track window width for responsive columns
	$effect(() => {
		windowWidth = window.innerWidth

		const handleResize = () => {
			windowWidth = window.innerWidth
		}

		window.addEventListener('resize', handleResize)

		return () => {
			window.removeEventListener('resize', handleResize)
		}
	})
</script>

<div class="thumbnails">
	{#each Array(totalSlots) as _, index}
		{#if index < displayItems.length}
			<button
				type="button"
				class="thumbnail"
				class:active={index === selectedIndex}
				onclick={() => onselect(index)}
				aria-label="View image {index + 1}"
			>
				<img
					src={displayItems[index].thumbnailUrl || displayItems[index].url}
					alt="{displayItems[index].alt || alt} thumbnail {index + 1}"
				/>
			</button>
		{:else if index === displayItems.length && showMoreThumbnail}
			<a
				href={showMoreLink}
				class="thumbnail show-more"
				aria-label="View all {totalCount || items.length} photos"
			>
				{#if items[displayItems.length]}
					<img
						src={items[displayItems.length].thumbnailUrl || items[displayItems.length].url}
						alt="View all photos"
						class="blurred-bg"
					/>
				{:else if items[items.length - 1]}
					<img
						src={items[items.length - 1].thumbnailUrl || items[items.length - 1].url}
						alt="View all photos"
						class="blurred-bg"
					/>
				{/if}
				<div class="show-more-overlay">
					+{remainingCount}
				</div>
			</a>
		{:else}
			<div class="thumbnail placeholder" aria-hidden="true"></div>
		{/if}
	{/each}
</div>

<style lang="scss">
	.thumbnails {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: $unit-2x;

		@media (max-width: 600px) {
			grid-template-columns: repeat(4, 1fr);
		}

		@media (max-width: 400px) {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.thumbnail {
		position: relative;
		aspect-ratio: 1;
		border-radius: $image-corner-radius;
		overflow: hidden;
		border: none;
		padding: 0;
		background: none;
		cursor: pointer;
		transition: all 0.2s ease;

		&::before {
			content: '';
			position: absolute;
			inset: 0;
			border-radius: $image-corner-radius;
			border: 4px solid transparent;
			z-index: $z-index-above;
			pointer-events: none;
			transition: border-color 0.2s ease;
		}

		&::after {
			content: '';
			position: absolute;
			inset: 4px;
			border-radius: calc($image-corner-radius - 4px);
			border: 4px solid transparent;
			z-index: $z-index-hover;
			pointer-events: none;
			transition: border-color 0.2s ease;
		}

		&:hover {
			transform: scale(0.98);
		}

		&:focus-visible {
			outline: none;

			&::before {
				border-color: $red-90;
			}

			&::after {
				border-color: $gray-100;
			}
		}

		&.active {
			&::before {
				border-color: $red-60;
			}

			&::after {
				border-color: $gray-100;
			}
		}

		&.placeholder {
			background: $gray-90;
			cursor: default;

			&:hover {
				transform: none;
			}
		}

		&.show-more {
			position: relative;
			color: inherit;
			text-decoration: none;

			.blurred-bg {
				filter: blur(3px);
				transform: scale(1.1); // Slightly scale to hide blur edges
			}

			.show-more-overlay {
				position: absolute;
				inset: 0;
				background: rgba(0, 0, 0, 0.6);
				color: white;
				display: flex;
				align-items: center;
				justify-content: center;
				font-size: 1.2rem;
				font-weight: 600;
				border-radius: $image-corner-radius;
				z-index: $z-index-above;
			}

			&:hover {
				.show-more-overlay {
					background: rgba(0, 0, 0, 0.7);
				}
			}

			&:focus-visible {
				outline: none;

				&::before {
					border-color: $red-90;
				}

				.show-more-overlay {
					box-shadow: inset 0 0 0 3px rgba($red-90, 0.5);
				}
			}
		}

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
			position: relative;
			z-index: $z-index-base;
		}
	}
</style>
