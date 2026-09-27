<script lang="ts">
	import type { SlideItem } from '$lib/public/slideshow'
	import SlideshowThumbnails from './public/SlideshowThumbnails.svelte'
	import Lightbox from './Lightbox.svelte'
	import TiltCard from './TiltCard.svelte'

	let {
		items = [],
		alt = 'Image',
		showThumbnails = true,
		maxThumbnails,
		totalCount,
		showMoreLink
	}: {
		items: SlideItem[]
		alt?: string
		showThumbnails?: boolean
		aspectRatio?: string
		maxThumbnails?: number
		totalCount?: number
		showMoreLink?: string
	} = $props()

	let selectedIndex = $state(0)
	let lightboxOpen = $state(false)
	// Convert items to image URLs for lightbox
	const lightboxImages = $derived(items.map((item) => item.url))

	$effect(() => {
		if (selectedIndex >= items.length) selectedIndex = Math.max(0, items.length - 1)
	})

	const selectImage = (index: number) => {
		selectedIndex = index
	}

	const openLightbox = (index?: number) => {
		if (index !== undefined) {
			selectedIndex = index
		}
		lightboxOpen = true
	}
</script>

{#if items.length === 1}
	<!-- Single image -->
	<TiltCard>
		<div
			class="single-image image-container"
			role="button"
			tabindex="0"
			onclick={() => openLightbox()}
			onkeydown={(e) => e.key === 'Enter' && openLightbox()}
		>
			<img src={items[0].url} alt={items[0].alt || alt} />
			{#if items[0].caption}
				<div class="image-caption">{items[0].caption}</div>
			{/if}
		</div>
	</TiltCard>
{:else if items.length > 1}
	<!-- Slideshow -->
	<div class="slideshow">
		<TiltCard>
			<div
				class="main-image image-container"
				role="button"
				tabindex="0"
				onclick={() => openLightbox()}
				onkeydown={(e) => e.key === 'Enter' && openLightbox()}
			>
				<img
					src={items[selectedIndex].url}
					alt={items[selectedIndex].alt || `${alt} ${selectedIndex + 1}`}
				/>
				{#if items[selectedIndex].caption}
					<div class="image-caption">{items[selectedIndex].caption}</div>
				{/if}
			</div>
		</TiltCard>

		{#if showThumbnails}
			<SlideshowThumbnails
				{items}
				{alt}
				{selectedIndex}
				{maxThumbnails}
				{totalCount}
				{showMoreLink}
				onselect={selectImage}
			/>
		{/if}
	</div>
{/if}

<Lightbox images={lightboxImages} bind:selectedIndex bind:isOpen={lightboxOpen} {alt} />

<style lang="scss">
	.image-container {
		cursor: pointer;
		display: block;
		width: 100%;
		position: relative;

		&:focus {
			outline: 2px solid $red-60;
			outline-offset: 2px;
		}
	}

	.single-image,
	.main-image {
		width: 100%;
		aspect-ratio: v-bind(aspectRatio);
		border-radius: $image-corner-radius;
		overflow: hidden;
		display: flex;
		// Force GPU acceleration and proper clipping
		transform: translateZ(0);
		-webkit-backface-visibility: hidden;
		backface-visibility: hidden;

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
			display: block;
			flex-shrink: 0;
		}
	}

	.image-caption {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
		color: white;
		padding: $unit-3x $unit-2x $unit-2x;
		font-size: 0.875rem;
		line-height: 1.4;
	}

	.slideshow {
		display: flex;
		flex-direction: column;
		gap: $unit-2x;
	}
</style>
