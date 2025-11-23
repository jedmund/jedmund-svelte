<script lang="ts">
	import PhotoItem from './PhotoItem.svelte'
	import Masonry from 'svelte-bricks'
	import type { Photo } from '$lib/types/photos'

	interface Props {
		photos: Photo[]
		columns?: 1 | 2 | 3 | 'auto'
		gap?: 'small' | 'medium' | 'large'
		showCaptions?: boolean
		masonry?: boolean
		class?: string
	}

	let {
		photos = [],
		columns = 'auto',
		gap = 'medium',
		showCaptions = false,
		masonry = false,
		class: className = ''
	}: Props = $props()

	// Split photos into columns for column-based layouts
	function splitIntoColumns(photos: Photo[], numColumns: number): Photo[][] {
		const columns: Photo[][] = Array.from({ length: numColumns }, () => [])

		photos.forEach((photo, index) => {
			columns[index % numColumns].push(photo)
		})

		return columns
	}

	const columnPhotos = $derived(
		(columns === 1 || columns === 2 || columns === 3) && !masonry
			? splitIntoColumns(photos, columns)
			: []
	)

	// Window width for responsive masonry
	let windowWidth = $state(0)

	// Calculate masonry column widths based on columns prop
	const masonryConfig = $derived(() => {
		if (!masonry) return null

		const gapSize = gap === 'small' ? 8 : gap === 'large' ? 32 : 16

		if (columns === 1) {
			const width = windowWidth - 64 // Account for padding
			return { minColWidth: width, maxColWidth: width, gap: gapSize }
		} else if (columns === 2) {
			const width = Math.floor((windowWidth - 64 - gapSize) / 2)
			return { minColWidth: width - 10, maxColWidth: width + 10, gap: gapSize }
		} else if (columns === 3) {
			const width = Math.floor((windowWidth - 64 - gapSize * 2) / 3)
			return { minColWidth: width - 10, maxColWidth: width + 10, gap: gapSize }
		} else {
			// Auto columns
			return { minColWidth: 200, maxColWidth: 400, gap: gapSize }
		}
	})

	// Ensure unique IDs for svelte-bricks
	const getId = (photo: Photo) => photo.id

	// CSS classes based on props
	const gridClass = $derived(
		`photo-grid photo-grid--${columns === 'auto' ? 'auto' : `${columns}-column`} photo-grid--gap-${gap} ${masonry ? 'photo-grid--masonry' : 'photo-grid--square'} ${className}`
	)
</script>

<svelte:window bind:innerWidth={windowWidth} />

<div class={gridClass}>
	{#if masonry && masonryConfig()}
		{@const config = masonryConfig()}
		<!-- Masonry layout using svelte-bricks -->
		<Masonry
			items={photos}
			minColWidth={config.minColWidth}
			maxColWidth={config.maxColWidth}
			gap={config.gap}
			{getId}
			animate={false}
			duration={0}
			class="photo-masonry"
		>
			{#snippet children({ item })}
				<div class="photo-grid__item">
					<PhotoItem {item} />
					{#if showCaptions}
						<p class="photo-caption">{item.caption || ''}</p>
					{/if}
				</div>
			{/snippet}
		</Masonry>
	{:else if (columns === 1 || columns === 2 || columns === 3) && !masonry}
		<!-- Column-based layout for square thumbnails -->
		{#each columnPhotos as column}
			<div class="photo-grid__column">
				{#each column as photo}
					<div class="photo-grid__item">
						<PhotoItem item={photo} />
						{#if showCaptions}
							<p class="photo-caption">{photo.caption || ''}</p>
						{/if}
					</div>
				{/each}
			</div>
		{/each}
	{:else}
		<!-- Auto grid layout -->
		<div class="photo-grid__auto">
			{#each photos as photo}
				<div class="photo-grid__item">
					<PhotoItem item={photo} />
					{#if showCaptions}
						<p class="photo-caption">{photo.caption || ''}</p>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style lang="scss">
	.photo-grid {
		width: 100%;

		// Gap variations
		&--gap-small {
			--grid-gap: 8px;
		}
		&--gap-medium {
			--grid-gap: 16px;
		}
		&--gap-large {
			--grid-gap: 32px;
		}

		// Column-based layouts
		&--1-column,
		&--2-column,
		&--3-column {
			display: flex;
			gap: var(--grid-gap);

			@include breakpoint('mobile') {
				flex-direction: column;
			}
		}

		&__column {
			flex: 1;
			display: flex;
			flex-direction: column;
			gap: var(--grid-gap);
		}

		// Square thumbnail mode (non-masonry, except for single column)
		&--square {
			// Only apply square thumbnails for multi-column and auto layouts
			&.photo-grid--2-column,
			&.photo-grid--3-column,
			&.photo-grid--auto {
				.photo-grid__item {
					:global(.photo-item) {
						aspect-ratio: 1;
						// overflow: hidden;
					}

					:global(.photo-button) {
						height: 100%;
					}

					:global(.single-photo) {
						height: 100%;
						aspect-ratio: 1 !important;
					}

					:global(.single-photo img) {
						width: 100%;
						height: 100%;
						object-fit: cover;
					}
				}
			}
		}

		// Masonry mode using svelte-bricks
		&--masonry {
			:global(.photo-masonry) {
				width: 100%;
			}
		}

		// Auto grid
		&--auto &__auto {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
			gap: var(--grid-gap);

			@include breakpoint('tablet') {
				grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
			}

			@include breakpoint('mobile') {
				grid-template-columns: 1fr;
			}
		}

		&__item {
			break-inside: avoid;
			margin-bottom: 0; // Override PhotoItem default
		}
	}

	.photo-caption {
		margin-top: $unit;
		font-size: 0.875rem;
		color: $gray-40;
		line-height: 1.4;
	}

	// Responsive adjustments
	@include breakpoint('mobile') {
		.photo-grid {
			&--2-column &__column {
				width: 100%;
			}
		}
	}
</style>
