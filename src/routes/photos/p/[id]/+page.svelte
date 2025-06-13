<script lang="ts">
	import BackButton from '$components/BackButton.svelte'
	import PhotoView from '$components/PhotoView.svelte'
	import PhotoMetadata from '$components/PhotoMetadata.svelte'
	import { generateMetaTags } from '$lib/utils/metadata'
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { onMount } from 'svelte'
	import { spring } from 'svelte/motion'
	import type { PageData } from './$types'
	import { isAlbum } from '$lib/types/photos'
	import ArrowLeft from '$icons/arrow-left.svg'
	import ArrowRight from '$icons/arrow-right.svg'

	let { data }: { data: PageData } = $props()

	const photo = $derived(data.photo)
	const error = $derived(data.error)
	const photoItems = $derived(data.photoItems || [])
	const currentPhotoId = $derived(data.currentPhotoId)

	// Hover tracking for arrow buttons
	let isHoveringLeft = $state(false)
	let isHoveringRight = $state(false)
	
	// Spring stores for smooth button movement
	const leftButtonCoords = spring({ x: 0, y: 0 }, {
		stiffness: 0.3,
		damping: 0.8
	})
	
	const rightButtonCoords = spring({ x: 0, y: 0 }, {
		stiffness: 0.3,
		damping: 0.8
	})
	
	// Default button positions (will be set once photo loads)
	let defaultLeftX = 0
	let defaultRightX = 0

	const pageUrl = $derived($page.url.href)

	// Generate metadata
	const metaTags = $derived(
		photo
			? generateMetaTags({
					title: photo.title || 'Photo',
					description: photo.description || photo.caption || 'A photograph',
					url: pageUrl,
					image: photo.url,
					titleFormat: { type: 'by' }
				})
			: generateMetaTags({
					title: 'Photo Not Found',
					description: 'The photo you are looking for could not be found.',
					url: pageUrl,
					noindex: true
				})
	)

	// Generate JSON-LD for photo
	const photoJsonLd = $derived(
		photo
			? {
					'@context': 'https://schema.org',
					'@type': 'ImageObject',
					name: photo.title || 'Photo',
					description: photo.description || photo.caption,
					contentUrl: photo.url,
					url: pageUrl,
					dateCreated: photo.createdAt,
					author: {
						'@type': 'Person',
						name: '@jedmund'
					}
				}
			: null
	)

	// Parse EXIF data if available
	const exifData = $derived(
		photo?.exifData && typeof photo.exifData === 'object' ? photo.exifData : null
	)

	// Get previous and next photos (excluding albums)
	const adjacentPhotos = $derived(() => {
		if (!photoItems.length || !currentPhotoId) return { prev: null, next: null }

		// Filter out albums - we only want photos
		const photosOnly = photoItems.filter((item) => !isAlbum(item))
		const currentIndex = photosOnly.findIndex((item) => item.id === currentPhotoId)

		if (currentIndex === -1) return { prev: null, next: null }

		return {
			prev: currentIndex > 0 ? photosOnly[currentIndex - 1] : null,
			next: currentIndex < photosOnly.length - 1 ? photosOnly[currentIndex + 1] : null
		}
	})

	// Handle photo navigation
	function navigateToPhoto(item: any) {
		if (!item) return
		// Extract media ID from item.id (could be 'media-123' or 'photo-123')
		const mediaId = item.id.replace(/^(media|photo)-/, '')
		goto(`/photos/p/${mediaId}`)
	}

	function handleKeydown(e: KeyboardEvent) {
		// Arrow key navigation for photos
		if (e.key === 'ArrowLeft' && adjacentPhotos().prev) {
			navigateToPhoto(adjacentPhotos().prev)
		} else if (e.key === 'ArrowRight' && adjacentPhotos().next) {
			navigateToPhoto(adjacentPhotos().next)
		}
	}

	// Set default button positions when component mounts
	$effect(() => {
		if (!photo) return
		
		// Wait for DOM to update and image to load
		const checkAndSetPositions = () => {
			const pageContainer = document.querySelector('.photo-page') as HTMLElement
			const photoImage = pageContainer?.querySelector('.photo-content-wrapper img') as HTMLElement
			
			if (photoImage && photoImage.complete) {
				const imageRect = photoImage.getBoundingClientRect()
				const pageRect = pageContainer.getBoundingClientRect()
				
				// Calculate default positions relative to the image
				// Add 24px (half button width) since we're using translate(-50%, -50%)
				defaultLeftX = (imageRect.left - pageRect.left) - 24 - 16 // half button width + gap
				defaultRightX = (imageRect.right - pageRect.left) + 24 + 16 // half button width + gap
				
				// Set initial positions at the vertical center of the image
				const centerY = (imageRect.top - pageRect.top) + (imageRect.height / 2)
				leftButtonCoords.set({ x: defaultLeftX, y: centerY }, { hard: true })
				rightButtonCoords.set({ x: defaultRightX, y: centerY }, { hard: true })
				
				// Check if mouse is already in a hover zone
				checkInitialMousePosition(pageContainer, imageRect, pageRect)
			} else {
				// If image not loaded yet, try again
				setTimeout(checkAndSetPositions, 50)
			}
		}
		
		checkAndSetPositions()
	})
	
	// We'll just remove the initial check for now
	function checkInitialMousePosition(pageContainer: HTMLElement, imageRect: DOMRect, pageRect: DOMRect) {
		// This will be handled by the first mouse move
	}

	// Mouse tracking for hover areas
	function handleMouseMove(event: MouseEvent) {
		const pageContainer = event.currentTarget as HTMLElement
		const photoWrapper = pageContainer.querySelector('.photo-content-wrapper') as HTMLElement
		
		if (!photoWrapper) return
		
		// Get the actual image element inside PhotoView
		const photoImage = photoWrapper.querySelector('img') as HTMLElement
		if (!photoImage) return
		
		const pageRect = pageContainer.getBoundingClientRect()
		const photoRect = photoImage.getBoundingClientRect()
		
		const x = event.clientX
		const mouseX = event.clientX - pageRect.left
		const mouseY = event.clientY - pageRect.top
		
		// Check if mouse is in the left or right margin (outside the photo)
		const wasHoveringLeft = isHoveringLeft
		const wasHoveringRight = isHoveringRight
		
		isHoveringLeft = x < photoRect.left
		isHoveringRight = x > photoRect.right
		
		// Calculate image center Y position
		const imageCenterY = (photoRect.top - pageRect.top) + (photoRect.height / 2)
		
		// Update button positions
		if (isHoveringLeft) {
			leftButtonCoords.set({ x: mouseX, y: mouseY })
		} else if (wasHoveringLeft && !isHoveringLeft) {
			// Reset left button to default
			leftButtonCoords.set({ x: defaultLeftX, y: imageCenterY })
		}
		
		if (isHoveringRight) {
			rightButtonCoords.set({ x: mouseX, y: mouseY })
		} else if (wasHoveringRight && !isHoveringRight) {
			// Reset right button to default
			rightButtonCoords.set({ x: defaultRightX, y: imageCenterY })
		}
	}

	function handleMouseLeave() {
		isHoveringLeft = false
		isHoveringRight = false
		
		// Reset buttons to default positions
		const pageContainer = document.querySelector('.photo-page') as HTMLElement
		const photoImage = pageContainer?.querySelector('.photo-content-wrapper img') as HTMLElement
		
		if (photoImage && pageContainer) {
			const imageRect = photoImage.getBoundingClientRect()
			const pageRect = pageContainer.getBoundingClientRect()
			const centerY = (imageRect.top - pageRect.top) + (imageRect.height / 2)
			
			leftButtonCoords.set({ x: defaultLeftX, y: centerY })
			rightButtonCoords.set({ x: defaultRightX, y: centerY })
		}
	}

	// Set up keyboard listener
	$effect(() => {
		window.addEventListener('keydown', handleKeydown)
		return () => window.removeEventListener('keydown', handleKeydown)
	})
</script>

<svelte:head>
	<title>{metaTags.title}</title>
	<meta name="description" content={metaTags.description} />

	<!-- OpenGraph -->
	{#each Object.entries(metaTags.openGraph) as [property, content]}
		<meta property="og:{property}" {content} />
	{/each}

	<!-- Twitter Card -->
	{#each Object.entries(metaTags.twitter) as [property, content]}
		<meta name="twitter:{property}" {content} />
	{/each}

	<!-- Canonical URL -->
	<link rel="canonical" href={metaTags.other.canonical} />

	<!-- JSON-LD -->
	{#if photoJsonLd}
		{@html `<script type="application/ld+json">${JSON.stringify(photoJsonLd)}</script>`}
	{/if}
</svelte:head>

{#if error}
	<div class="error-container">
		<div class="error-message">
			<h1>Photo Not Found</h1>
			<p>{error}</p>
			<BackButton href="/photos" label="Back to Photos" />
		</div>
	</div>
{:else if photo}
	<div 
		class="photo-page"
		onmousemove={handleMouseMove}
		onmouseleave={handleMouseLeave}
	>
		<div class="photo-content-wrapper">
			<PhotoView 
				src={photo.url} 
				alt={photo.caption} 
				title={photo.title}
				id={photo.id}
			/>
		</div>

		<!-- Adjacent Photos Navigation -->
		<div class="adjacent-navigation">
			{#if adjacentPhotos().prev}
				<button
					class="nav-button prev"
					class:hovering={isHoveringLeft}
					style="
						left: {$leftButtonCoords.x}px;
						top: {$leftButtonCoords.y}px;
						transform: translate(-50%, -50%);
					"
					onclick={() => navigateToPhoto(adjacentPhotos().prev)}
					type="button"
					aria-label="Previous photo"
				>
					<ArrowLeft class="nav-icon" />
				</button>
			{/if}

			{#if adjacentPhotos().next}
				<button
					class="nav-button next"
					class:hovering={isHoveringRight}
					style="
						left: {$rightButtonCoords.x}px;
						top: {$rightButtonCoords.y}px;
						transform: translate(-50%, -50%);
					"
					onclick={() => navigateToPhoto(adjacentPhotos().next)}
					type="button"
					aria-label="Next photo"
				>
					<ArrowRight class="nav-icon" />
				</button>
			{/if}
		</div>

		<PhotoMetadata
			title={photo.title}
			caption={photo.caption}
			description={photo.description}
			{exifData}
			createdAt={photo.createdAt}
			backHref={photo.album ? `/photos/${photo.album.slug}` : '/photos'}
			backLabel={photo.album ? `Back to ${photo.album.title}` : 'Back to Photos'}
			showBackButton={true}
		/>
	</div>
{/if}

<style lang="scss">
	@import '$styles/variables.scss';
	@import '$styles/mixins.scss';
	.error-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 60vh;
		padding: $unit-6x $unit-3x;
	}

	.error-message {
		text-align: center;
		max-width: 500px;

		h1 {
			font-size: 1.75rem;
			font-weight: 600;
			margin: 0 0 $unit-2x;
			color: $red-60;
		}

		p {
			margin: 0 0 $unit-3x;
			color: $grey-40;
			line-height: 1.5;
		}
	}

	.photo-page {
		width: 100%;
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 $unit-3x $unit-4x;
		align-items: center;
		display: flex;
		flex-direction: column;
		gap: $unit-2x;
		box-sizing: border-box;
		position: relative;

		@include breakpoint('tablet') {
			max-width: 900px;
		}

		@include breakpoint('phone') {
			padding: 0 $unit-2x $unit-2x;
			gap: $unit;
		}
	}

	.photo-content-wrapper {
		position: relative;
		max-width: 700px;
		width: 100%;
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: center;
	}


	// Adjacent Navigation
	.adjacent-navigation {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		right: 0;
		display: flex;
		justify-content: space-between;
		align-items: center;
		pointer-events: none;
		z-index: 100;

		// Hide on mobile and tablet
		@include breakpoint('tablet') {
			display: none;
		}
	}

	.nav-button {
		width: 48px;
		height: 48px;
		pointer-events: auto;
		position: absolute;
		border: none;
		padding: 0;
		background: $grey-100;
		cursor: pointer;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s ease, box-shadow 0.2s ease;

		&:hover {
			background: $grey-95;
		}
		
		&.hovering {
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
			
			&:hover {
				box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
			}
		}

		&:focus-visible {
			outline: none;
			box-shadow:
				0 0 0 3px $red-60,
				0 0 0 5px $grey-100;
		}

		:global(svg) {
			stroke: $grey-10;
			width: 16px;
			height: 16px;
			fill: none;
			stroke-width: 2px;
			stroke-linecap: round;
			stroke-linejoin: round;
		}
	}
</style>
