<script lang="ts">
	let {
		images = [],
		alt = ''
	}: {
		images: string[]
		alt?: string
	} = $props()

	let selectedIndex = $state(0)
	
	const selectImage = (index: number) => {
		selectedIndex = index
	}
</script>

{#if images.length === 1}
	<!-- Single image -->
	<div class="single-image">
		<img src={images[0]} {alt} />
	</div>
{:else if images.length > 1}
	<!-- Slideshow -->
	<div class="slideshow">
		<div class="main-image">
			<img src={images[selectedIndex]} alt="{alt} {selectedIndex + 1}" />
		</div>
		<div class="thumbnails">
			{#each images as image, index}
				<button 
					class="thumbnail" 
					class:active={index === selectedIndex}
					onclick={() => selectImage(index)}
					aria-label="View image {index + 1}"
				>
					<img src={image} alt="{alt} thumbnail {index + 1}" />
				</button>
			{/each}
		</div>
	</div>
{/if}

<style lang="scss">
	.single-image,
	.main-image {
		width: 100%;
		aspect-ratio: 4 / 3;
		border-radius: $card-corner-radius;
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
		grid-template-columns: repeat(auto-fill, minmax(calc(25% - 12px), 1fr));
		gap: $unit-2x;
		
		@media (max-width: 600px) {
			grid-template-columns: repeat(auto-fill, minmax(calc(33.33% - 11px), 1fr));
		}
		
		@media (max-width: 400px) {
			grid-template-columns: repeat(auto-fill, minmax(calc(50% - 8px), 1fr));
		}
	}

	.thumbnail {
		position: relative;
		aspect-ratio: 1;
		border-radius: $card-corner-radius;
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
			border-radius: $card-corner-radius;
			border: 4px solid transparent;
			z-index: 2;
			pointer-events: none;
			transition: border-color 0.2s ease;
		}
		
		&::after {
			content: '';
			position: absolute;
			inset: 4px;
			border-radius: calc($card-corner-radius - 4px);
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
		
		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
			position: relative;
			z-index: 1;
		}
	}
</style>