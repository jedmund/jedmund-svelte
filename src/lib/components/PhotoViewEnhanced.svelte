<script lang="ts">
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
			console.log('Ultrawide check from props:', {
				width,
				height,
				ratio: width / height,
				isUltrawide
			})
		} else if (imageRef && imageLoaded) {
			isUltrawide = imageRef.naturalWidth / imageRef.naturalHeight > 2
			console.log('Ultrawide check from image:', {
				naturalWidth: imageRef.naturalWidth,
				naturalHeight: imageRef.naturalHeight,
				ratio: imageRef.naturalWidth / imageRef.naturalHeight,
				isUltrawide
			})
		}
	}

	// Update scroll indicators based on scroll position
	function updateScrollIndicators(modal: HTMLElement) {
		const isAtStart = modal.scrollLeft <= 0
		const isAtEnd = modal.scrollLeft >= modal.scrollWidth - modal.clientWidth - 1

		if (isAtStart) {
			modal.setAttribute('data-at-start', '')
		} else {
			modal.removeAttribute('data-at-start')
		}

		if (isAtEnd) {
			modal.setAttribute('data-at-end', '')
		} else {
			modal.removeAttribute('data-at-end')
		}
	}

	// Enhance zoom behavior for ultrawide images
	function enhanceZoomForUltrawide() {
		if (!isUltrawide) return

		console.log('Setting up ultrawide zoom enhancement')

		// Wait for zoom to be activated
		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				if (mutation.type === 'childList') {
					// Check for zoom overlay - try multiple selectors
					const zoomOverlay =
						document.querySelector('[data-smiz-overlay]') ||
						document.querySelector('.medium-image-zoom-overlay') ||
						document.querySelector('[data-rmiz-modal-overlay]')
					const zoomedImage =
						document.querySelector('[data-smiz-modal] img') ||
						document.querySelector('.medium-image-zoom-image') ||
						(document.querySelector('[data-rmiz-modal-img]') as HTMLImageElement)

					console.log('Checking for zoom elements:', {
						zoomOverlay: !!zoomOverlay,
						zoomedImage: !!zoomedImage,
						allDivs: document.querySelectorAll('div').length,
						bodyChildren: document.body.children.length
					})

					// Also check for any new elements with specific classes
					const allNewElements = mutation.addedNodes
					allNewElements.forEach((node) => {
						if (node.nodeType === 1) {
							// Element node
							const element = node as HTMLElement
							console.log(
								'New element added:',
								element.tagName,
								element.className,
								element.getAttribute('data-rmiz-modal-overlay')
							)
						}
					})

					if (zoomOverlay && zoomedImage) {
						console.log('Zoom activated, applying ultrawide enhancements')
						// Add custom class for ultrawide handling
						zoomOverlay.classList.add('ultrawide-zoom')

						// Make the zoomed image scrollable horizontally
						const modal = zoomedImage.closest('[data-smiz-modal]') as HTMLElement
						if (modal) {
							modal.style.overflow = 'auto'
							modal.style.maxHeight = '90vh'

							// Adjust image height to fill more vertical space for ultrawide
							zoomedImage.style.maxHeight = '85vh'
							zoomedImage.style.height = 'auto'
							zoomedImage.style.width = 'auto'
							zoomedImage.style.maxWidth = 'none'

							// Center the scroll position initially
							setTimeout(() => {
								const scrollLeft = (modal.scrollWidth - modal.clientWidth) / 2
								modal.scrollLeft = scrollLeft
								updateScrollIndicators(modal)
							}, 50)

							// Add scroll listener to update indicators
							modal.addEventListener('scroll', () => updateScrollIndicators(modal))
						}
					}
				}
			})
		})

		observer.observe(document.body, {
			childList: true,
			subtree: true
		})

		// Clean up observer when component unmounts
		return () => observer.disconnect()
	}

	$effect(() => {
		checkIfUltrawide()
	})

	$effect(() => {
		if (isUltrawide && imageLoaded && !isMobile) {
			const cleanup = enhanceZoomForUltrawide()
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
	@import '$styles/variables.scss';
	@import '$styles/mixins.scss';

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

			// Hide indicators when scrolled to edges
			&[data-at-start]::before {
				opacity: 0;
			}

			&[data-at-end]::after {
				opacity: 0;
			}
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
