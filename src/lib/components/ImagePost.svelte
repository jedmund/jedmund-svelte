<script lang="ts">
	import Lightbox from './Lightbox.svelte'

	let {
		images = [],
		alt = ''
	}: {
		images: string[]
		alt?: string
	} = $props()

	let selectedIndex = $state(0)
	let lightboxOpen = $state(false)
	let windowWidth = $state(0)
	
	// Calculate columns based on breakpoints
	const columnsPerRow = $derived(windowWidth <= 400 ? 3 : windowWidth <= 600 ? 4 : 6)
	const totalSlots = $derived(Math.ceil(images.length / columnsPerRow) * columnsPerRow)

	const selectImage = (index: number) => {
		selectedIndex = index
	}

	const openLightbox = (index?: number) => {
		if (index !== undefined) {
			selectedIndex = index
		}
		lightboxOpen = true
	}
	
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

{#if images.length === 1}
	<!-- Single image -->
	<button class="single-image image-button" onclick={() => openLightbox()}>
		<img src={images[0]} {alt} />
	</button>
{:else if images.length > 1}
	<!-- Slideshow -->
	<div class="slideshow">
		<button class="main-image image-button" onclick={() => openLightbox()}>
			<img src={images[selectedIndex]} alt="{alt} {selectedIndex + 1}" />
		</button>
		<div class="thumbnails">
			{#each Array(totalSlots) as _, index}
				{#if index < images.length}
					<button
						class="thumbnail"
						class:active={index === selectedIndex}
						onclick={() => selectImage(index)}
						aria-label="View image {index + 1}"
					>
						<img src={images[index]} alt="{alt} thumbnail {index + 1}" />
					</button>
				{:else}
					<div class="thumbnail placeholder" aria-hidden="true"></div>
				{/if}
			{/each}
		</div>
	</div>
{/if}

<Lightbox {images} bind:selectedIndex bind:isOpen={lightboxOpen} {alt} />

<style lang="scss">
	.image-button {
		border: none;
		padding: 0;
		background: none;
		cursor: pointer;
		display: block;
		width: 100%;
		transition: transform 0.2s ease;

		&:hover {
			transform: scale(0.98);
		}

		&:focus {
			outline: 2px solid $red-60;
			outline-offset: 2px;
		}
	}

	.single-image,
	.main-image {
		aspect-ratio: 4 / 3;
		border-radius: $image-corner-radius;
		overflow: hidden;

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}
	}

	.slideshow {
		display: flex;
		flex-direction: column;
		gap: $unit-2x;
	}

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
			z-index: 2;
			pointer-events: none;
			transition: border-color 0.2s ease;
		}

		&::after {
			content: '';
			position: absolute;
			inset: 4px;
			border-radius: calc($image-corner-radius - 4px);
			border: 4px solid transparent;
			z-index: 3;
			pointer-events: none;
			transition: border-color 0.2s ease;
		}

		&:hover {
			transform: scale(0.98);
		}

		&.active {
			&::before {
				border-color: $red-60;
			}

			&::after {
				border-color: $grey-100;
			}
		}
		
		&.placeholder {
			background: $grey-90;
			cursor: default;
			
			&:hover {
				transform: none;
			}
		}

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
			position: relative;
			z-index: 1;
		}
	}
</style>
