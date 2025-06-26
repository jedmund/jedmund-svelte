<script lang="ts">
	import PhotoItem from './PhotoItem.svelte'
	import type { PhotoItem as PhotoItemType, Photo } from '$lib/types/photos'

	interface Props {
		photoItems: PhotoItemType[]
		columns?: 1 | 2 | 3 | 'auto'
		gap?: 'small' | 'medium' | 'large'
		showCaptions?: boolean
		albumSlug?: string
		onItemClick?: (item: PhotoItemType) => void
		class?: string
	}

	let {
		photoItems = [],
		columns = 'auto',
		gap = 'medium',
		showCaptions = false,
		albumSlug,
		onItemClick,
		class: className = ''
	}: Props = $props()

	// Gap size mapping
	const gapSizes = {
		small: '$unit',
		medium: '$unit-2x',
		large: '$unit-4x'
	}

	// Check if an image is ultrawide (aspect ratio > 2.5)
	function isUltrawide(item: PhotoItemType): boolean {
		if ('photos' in item) return false // Albums can't be ultrawide
		const photo = item as Photo
		return (photo.aspectRatio || photo.width / photo.height) > 2.5
	}

	// Process items for three-column layout with ultrawide support
	function processItemsForThreeColumns(items: PhotoItemType[]): Array<{
		item: PhotoItemType
		span: number
		columnStart?: number
	}> {
		const processed = []
		let currentColumn = 0

		for (const item of items) {
			if (isUltrawide(item)) {
				// Ultrawide images span based on current position
				if (currentColumn === 0) {
					// Left-aligned, spans 2 columns
					processed.push({ item, span: 2, columnStart: 1 })
					currentColumn = 2
				} else if (currentColumn === 1) {
					// Center, spans 2 columns
					processed.push({ item, span: 2, columnStart: 2 })
					currentColumn = 0 // Wrap to next row
				} else {
					// Right column, place in next row spanning 2 from left
					processed.push({ item, span: 2, columnStart: 1 })
					currentColumn = 2
				}
			} else {
				// Regular images
				processed.push({ item, span: 1 })
				currentColumn = (currentColumn + 1) % 3
			}
		}

		return processed
	}

	// Split items into columns for column-based layouts
	function splitIntoColumns(items: PhotoItemType[], numColumns: number): PhotoItemType[][] {
		const columns: PhotoItemType[][] = Array.from({ length: numColumns }, () => [])
		
		items.forEach((item, index) => {
			columns[index % numColumns].push(item)
		})
		
		return columns
	}

	// Process items based on layout
	const processedItems = $derived(() => {
		if (columns === 3) {
			return processItemsForThreeColumns(photoItems)
		}
		return photoItems.map(item => ({ item, span: 1 }))
	})

	const columnItems = $derived(() => {
		if (columns === 1 || columns === 2) {
			return splitIntoColumns(photoItems, columns)
		}
		return []
	})

	// CSS classes based on props
	const gridClass = $derived(
		`photo-grid photo-grid--${columns === 'auto' ? 'auto' : `${columns}-column`} photo-grid--gap-${gap} ${className}`
	)
</script>

<div class={gridClass}>
	{#if columns === 1 || columns === 2}
		<!-- Column-based layout -->
		{#each columnItems as columnPhotos, colIndex}
			<div class="photo-grid__column">
				{#each columnPhotos as item}
					<div class="photo-grid__item">
						<PhotoItem {item} />
						{#if showCaptions && !('photos' in item)}
							<p class="photo-caption">{item.caption || ''}</p>
						{/if}
					</div>
				{/each}
			</div>
		{/each}
	{:else if columns === 3}
		<!-- Three column grid with ultrawide support -->
		<div class="photo-grid__three-column">
			{#each processedItems() as { item, span, columnStart }}
				<div 
					class="photo-grid__item"
					class:ultrawide={span > 1}
					style={columnStart ? `grid-column-start: ${columnStart};` : ''}
					style:grid-column-end={span > 1 ? `span ${span}` : ''}
				>
					<PhotoItem {item} />
					{#if showCaptions && !('photos' in item)}
						<p class="photo-caption">{item.caption || ''}</p>
					{/if}
				</div>
			{/each}
		</div>
	{:else}
		<!-- Auto grid layout -->
		<div class="photo-grid__auto">
			{#each photoItems as item}
				<div class="photo-grid__item">
					<PhotoItem {item} />
					{#if showCaptions && !('photos' in item)}
						<p class="photo-caption">{item.caption || ''}</p>
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
		&--2-column {
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

		// Three column grid
		&--3-column &__three-column {
			display: grid;
			grid-template-columns: repeat(3, 1fr);
			gap: var(--grid-gap);
			width: 100%;

			@include breakpoint('tablet') {
				grid-template-columns: repeat(2, 1fr);
				
				.ultrawide {
					grid-column: 1 / -1 !important;
				}
			}

			@include breakpoint('mobile') {
				grid-template-columns: 1fr;
				
				.ultrawide {
					grid-column: 1 !important;
				}
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