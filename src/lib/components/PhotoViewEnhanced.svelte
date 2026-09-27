<script lang="ts">
	import { observeUltrawideZoom } from '$lib/public/ultrawide-zoom'
	import Zoom from 'svelte-medium-image-zoom'
	import 'svelte-medium-image-zoom/dist/styles.css'
	import { onMount } from 'svelte'

	interface Props {
		src: string
		alt?: string
		title?: string
		id?: string
		class?: string
		width?: number
		height?: number
	}

	let { src, alt = '', title, id, class: className = '', width, height }: Props = $props()

	let imageRef = $state<HTMLImageElement>()
	let isUltrawide = $state(false)
	let imageLoaded = $state(false)
	let isMobile = $state(false)

	// Detect if we're on a mobile device
	onMount(() => {
		// Check for touch capability and screen size
		const checkMobile = () => {
			const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
			const isSmallScreen = window.innerWidth <= 768
			isMobile = hasTouch && isSmallScreen
		}

		checkMobile()

		// Update on resize
		window.addEventListener('resize', checkMobile)
		return () => window.removeEventListener('resize', checkMobile)
	})

	// Check if image is ultrawide (aspect ratio > 2:1)
	function checkIfUltrawide() {
		if (width && height) {
			isUltrawide = width / height > 2
		} else if (imageRef && imageLoaded) {
			isUltrawide = imageRef.naturalWidth / imageRef.naturalHeight > 2
		}
	}

	$effect(() => {
		checkIfUltrawide()
	})

	$effect(() => {
		if (isUltrawide && imageLoaded && !isMobile) {
			const cleanup = observeUltrawideZoom()
			return cleanup
		}
	})

	function handleImageLoad() {
		imageLoaded = true
		checkIfUltrawide()
	}
</script>

<div class="photo-view {className}" class:ultrawide={isUltrawide} class:mobile={isMobile}>
	{#key id || src}
		{#if !isMobile}
			<Zoom>
				<img
					bind:this={imageRef}
					{src}
					alt={title || alt || 'Photo'}
					class="photo-image"
					onload={handleImageLoad}
				/>
			</Zoom>
		{:else}
			<img
				bind:this={imageRef}
				{src}
				alt={title || alt || 'Photo'}
				class="photo-image mobile-image"
				onload={handleImageLoad}
			/>
		{/if}
	{/key}
</div>

<style lang="scss">
	.photo-view {
		display: flex;
		justify-content: center;
		font-size: 0;
		line-height: 0;
		position: relative;
		z-index: 1;
	}

	.photo-image {
		display: block;
		width: 100%;
		height: auto;
		max-width: 700px;
		object-fit: contain;
		border-radius: $image-corner-radius;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);

		@include breakpoint('phone') {
			border-radius: $image-corner-radius;
		}
	}

	// Hide the zoom library's close button
	:global([data-smiz-btn-unzoom]) {
		display: none !important;
	}

	// Mobile-specific styles
	.mobile {
		.mobile-image {
			// Allow native zoom
			touch-action: pinch-zoom;
			// Ensure image is contained within viewport initially
			max-width: 100%;
			max-height: 80vh;
			width: auto;
			height: auto;
			// Prevent iOS from applying its own zoom on double-tap
			-webkit-user-select: none;
			user-select: none;
		}
	}

	// Ultrawide zoom enhancements
	:global(.ultrawide-zoom) {
		:global([data-smiz-modal]) {
			cursor: grab;

			&:active {
				cursor: grabbing;
			}

			// Add subtle scroll indicators
			&::before,
			&::after {
				content: '';
				position: absolute;
				top: 50%;
				transform: translateY(-50%);
				width: 40px;
				height: 100px;
				pointer-events: none;
				z-index: 10;
				transition: opacity $transition-medium ease;
			}

			&::before {
				left: 0;
				background: linear-gradient(to right, rgba(0, 0, 0, 0.3), transparent);
				border-radius: 0 $unit-2x $unit-2x 0;
			}

			&::after {
				right: 0;
				background: linear-gradient(to left, rgba(0, 0, 0, 0.3), transparent);
				border-radius: $unit-2x 0 0 $unit-2x;
			}
		}

		// Hide indicators when scrolled to edges
		:global([data-smiz-modal][data-at-start])::before {
			opacity: 0;
		}

		:global([data-smiz-modal][data-at-end])::after {
			opacity: 0;
		}

		// Scrollbar styling for ultrawide images
		:global([data-smiz-modal]) {
			scrollbar-width: thin;
			scrollbar-color: rgba(255, 255, 255, 0.3) transparent;

			&::-webkit-scrollbar {
				height: 8px;
			}

			&::-webkit-scrollbar-track {
				background: transparent;
			}

			&::-webkit-scrollbar-thumb {
				background: rgba(255, 255, 255, 0.3);
				border-radius: 4px;

				&:hover {
					background: rgba(255, 255, 255, 0.5);
				}
			}
		}
	}
</style>
