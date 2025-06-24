<script lang="ts">
	import SmartImage from './SmartImage.svelte'
	import type { Media } from '@prisma/client'

	interface Props {
		photos: Media[]
		layout?: 'masonry' | 'grid'
		onPhotoClick?: (photo: Media) => void
		class?: string
	}

	let { photos = [], layout = 'masonry', onPhotoClick, class: className = '' }: Props = $props()

	function handlePhotoClick(photo: Media) {
		if (onPhotoClick) {
			onPhotoClick(photo)
		}
	}
</script>

<div class="photo-grid photo-grid-{layout} {className}">
	{#each photos as photo}
		<div class="grid-item">
			{#if onPhotoClick}
				<button class="photo-button" onclick={() => handlePhotoClick(photo)} type="button">
					<SmartImage media={photo} alt={photo.description || ''} class="grid-photo" />
				</button>
			{:else}
				<SmartImage media={photo} alt={photo.description || ''} class="grid-photo" />
			{/if}
		</div>
	{/each}
</div>

<style lang="scss">
	@import '$styles/variables.scss';
	@import '$styles/mixins.scss';

	.photo-grid {
		width: 100%;
	}

	.photo-grid-masonry {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: $unit-2x;

		@include breakpoint('phone') {
			grid-template-columns: 1fr;
			gap: $unit;
		}

		.grid-item {
			break-inside: avoid;
		}
	}

	.photo-grid-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: $unit-2x;

		@include breakpoint('tablet') {
			grid-template-columns: repeat(2, 1fr);
		}

		@include breakpoint('phone') {
			grid-template-columns: 1fr;
			gap: $unit;
		}

		.grid-item {
			aspect-ratio: 1;
			overflow: hidden;
		}

		:global(.grid-photo) {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}
	}

	.grid-item {
		position: relative;
		overflow: hidden;
		border-radius: $image-corner-radius;
	}

	.photo-button {
		display: block;
		width: 100%;
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
		position: relative;

		&::after {
			content: '';
			position: absolute;
			inset: 0;
			background: rgba(0, 0, 0, 0);
			transition: background 0.2s ease;
			pointer-events: none;
		}

		&:hover::after {
			background: rgba(0, 0, 0, 0.1);
		}

		&:active::after {
			background: rgba(0, 0, 0, 0.2);
		}
	}

	:global(.grid-photo) {
		width: 100%;
		height: auto;
		display: block;
	}
</style>
