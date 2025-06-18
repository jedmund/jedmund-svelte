<script lang="ts">
	import BackButton from '$components/BackButton.svelte'
	import PhotoViewEnhanced from '$components/PhotoViewEnhanced.svelte'
	import PhotoMetadata from '$components/PhotoMetadata.svelte'
	import { generateMetaTags, generateCreativeWorkJsonLd } from '$lib/utils/metadata'
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { spring } from 'svelte/motion'
	import { getCurrentMousePosition } from '$lib/stores/mouse'
	import type { PageData } from './$types'
	import ArrowLeft from '$icons/arrow-left.svg'
	import ArrowRight from '$icons/arrow-right.svg'

	let { data }: { data: PageData } = $props()

	const photo = $derived(data.photo)
	const album = $derived(data.album)
	const navigation = $derived(data.navigation)
	const error = $derived(data.error)

	// Hover tracking for arrow buttons
	let isHoveringLeft = $state(false)
	let isHoveringRight = $state(false)

	// Spring stores for smooth button movement
	const leftButtonCoords = spring(
		{ x: 0, y: 0 },
		{
			stiffness: 0.3,
			damping: 0.8
		}
	)

	const rightButtonCoords = spring(
		{ x: 0, y: 0 },
		{
			stiffness: 0.3,
			damping: 0.8
		}
	)

	// Default button positions (will be set once photo loads)
	let defaultLeftX = 0
	let defaultRightX = 0

	const pageUrl = $derived($page.url.href)

	// Parse EXIF data if available
	const exifData = $derived(
		photo?.exifData && typeof photo.exifData === 'object' ? photo.exifData : null
	)

	// Generate metadata
	const photoTitle = $derived(photo?.title || photo?.caption || `Photo ${navigation?.currentIndex}`)
	const photoDescription = $derived(
		photo?.description || photo?.caption || `Photo from ${album?.title || 'album'}`
	)
	const metaTags = $derived(
		photo && album
			? generateMetaTags({
					title: photoTitle,
					description: photoDescription,
					url: pageUrl,
					type: 'article',
					image: photo.url,
					publishedTime: exifData?.dateTaken,
					author: 'Justin Edmund',
					titleFormat: { type: 'snippet', snippet: photoDescription }
				})
			: generateMetaTags({
					title: 'Photo Not Found',
					description: 'The photo you are looking for could not be found.',
					url: pageUrl,
					noindex: true
				})
	)

	// Generate creative work JSON-LD
	const photoJsonLd = $derived(
		photo && album
			? generateCreativeWorkJsonLd({
					name: photoTitle,
					description: photoDescription,
					url: pageUrl,
					image: photo.url,
					creator: 'Justin Edmund',
					dateCreated: exifData?.dateTaken,
					keywords: ['photography', album.title, ...(exifData?.location ? [exifData.location] : [])]
				})
			: null
	)

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
				defaultLeftX = imageRect.left - pageRect.left - 24 - 16 // half button width + gap
				defaultRightX = imageRect.right - pageRect.left + 24 + 16 // half button width + gap

				// Set initial positions at the vertical center of the image
				const centerY = imageRect.top - pageRect.top + imageRect.height / 2
				leftButtonCoords.set({ x: defaultLeftX, y: centerY }, { hard: true })
				rightButtonCoords.set({ x: defaultRightX, y: centerY }, { hard: true })

				// Check if mouse is already in a hover zone
				// Small delay to ensure mouse store is initialized
				setTimeout(() => {
					checkInitialMousePosition(pageContainer, imageRect, pageRect)
				}, 10)
			} else {
				// If image not loaded yet, try again
				setTimeout(checkAndSetPositions, 50)
			}
		}

		checkAndSetPositions()
	})

	// Check mouse position on load
	function checkInitialMousePosition(
		pageContainer: HTMLElement,
		imageRect: DOMRect,
		pageRect: DOMRect
	) {
		// Get current mouse position from store
		const currentPos = getCurrentMousePosition()

		// If no mouse position tracked yet, try to trigger one
		if (currentPos.x === 0 && currentPos.y === 0) {
			// Set up a one-time listener for the first mouse move
			const handleFirstMove = (e: MouseEvent) => {
				const x = e.clientX
				const mouseX = e.clientX - pageRect.left
				const mouseY = e.clientY - pageRect.top

				// Check if mouse is in hover zones
				if (x < imageRect.left) {
					isHoveringLeft = true
					leftButtonCoords.set({ x: mouseX, y: mouseY }, { hard: true })
				} else if (x > imageRect.right) {
					isHoveringRight = true
					rightButtonCoords.set({ x: mouseX, y: mouseY }, { hard: true })
				}

				// Remove the listener
				window.removeEventListener('mousemove', handleFirstMove)
			}

			window.addEventListener('mousemove', handleFirstMove)
			return
		}

		// We have a mouse position, check if it's in a hover zone
		const x = currentPos.x
		const mouseX = currentPos.x - pageRect.left
		const mouseY = currentPos.y - pageRect.top

		// Store client coordinates for scroll updates
		lastClientX = currentPos.x
		lastClientY = currentPos.y

		// Check if mouse is in hover zones
		if (x < imageRect.left) {
			isHoveringLeft = true
			leftButtonCoords.set({ x: mouseX, y: mouseY }, { hard: true })
		} else if (x > imageRect.right) {
			isHoveringRight = true
			rightButtonCoords.set({ x: mouseX, y: mouseY }, { hard: true })
		}
	}

	// Store last mouse client position for scroll updates
	let lastClientX = 0
	let lastClientY = 0

	// Update button positions during scroll
	function handleScroll() {
		if (!isHoveringLeft && !isHoveringRight) return

		const pageContainer = document.querySelector('.photo-page') as HTMLElement
		if (!pageContainer) return

		// Use last known mouse position (which is viewport-relative)
		// and recalculate relative to the page container's new position
		const pageRect = pageContainer.getBoundingClientRect()
		const mouseX = lastClientX - pageRect.left
		const mouseY = lastClientY - pageRect.top

		// Update button positions
		if (isHoveringLeft) {
			leftButtonCoords.set({ x: mouseX, y: mouseY })
		}

		if (isHoveringRight) {
			rightButtonCoords.set({ x: mouseX, y: mouseY })
		}
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

		// Store last mouse position for scroll updates
		lastClientX = event.clientX
		lastClientY = event.clientY

		// Check if mouse is in the left or right margin (outside the photo)
		const wasHoveringLeft = isHoveringLeft
		const wasHoveringRight = isHoveringRight

		isHoveringLeft = x < photoRect.left
		isHoveringRight = x > photoRect.right

		// Calculate image center Y position
		const imageCenterY = photoRect.top - pageRect.top + photoRect.height / 2

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
			const centerY = imageRect.top - pageRect.top + imageRect.height / 2

			leftButtonCoords.set({ x: defaultLeftX, y: centerY })
			rightButtonCoords.set({ x: defaultRightX, y: centerY })
		}
	}

	// Keyboard navigation
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowLeft' && navigation?.prevPhoto) {
			goto(`/photos/${album.slug}/${navigation.prevPhoto.id}`)
		} else if (e.key === 'ArrowRight' && navigation?.nextPhoto) {
			goto(`/photos/${album.slug}/${navigation.nextPhoto.id}`)
		}
	}

	// Set up keyboard and scroll listeners
	$effect(() => {
		window.addEventListener('keydown', handleKeydown)
		window.addEventListener('scroll', handleScroll)

		return () => {
			window.removeEventListener('keydown', handleKeydown)
			window.removeEventListener('scroll', handleScroll)
		}
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

	<!-- Other meta tags -->
	{#if metaTags.other.canonical}
		<link rel="canonical" href={metaTags.other.canonical} />
	{/if}
	{#if metaTags.other.robots}
		<meta name="robots" content={metaTags.other.robots} />
	{/if}

	<!-- JSON-LD -->
	{#if photoJsonLd}
		{@html `<script type="application/ld+json">${JSON.stringify(photoJsonLd)}</script>`}
	{/if}
</svelte:head>

{#if error || !photo || !album}
	<div class="error-container">
		<div class="error-message">
			<h1>Photo Not Found</h1>
			<p>{error || "The photo you're looking for doesn't exist."}</p>
			<BackButton href="/photos" label="Back to Photos" />
		</div>
	</div>
{:else}
	<div class="photo-page" onmousemove={handleMouseMove} onmouseleave={handleMouseLeave}>
		<div class="photo-content-wrapper">
			<PhotoViewEnhanced 
				src={photo.url} 
				alt={photo.caption} 
				title={photo.title} 
				id={photo.id}
				width={photo.width}
				height={photo.height}
			/>
		</div>

		<!-- Adjacent Photos Navigation -->
		<div class="adjacent-navigation">
			{#if navigation.prevPhoto}
				<button
					class="nav-button prev"
					class:hovering={isHoveringLeft}
					style="
						left: {$leftButtonCoords.x}px;
						top: {$leftButtonCoords.y}px;
						transform: translate(-50%, -50%);
					"
					onclick={() => goto(`/photos/${album.slug}/${navigation.prevPhoto.id}`)}
					type="button"
					aria-label="Previous photo"
				>
					<ArrowLeft class="nav-icon" />
				</button>
			{/if}

			{#if navigation.nextPhoto}
				<button
					class="nav-button next"
					class:hovering={isHoveringRight}
					style="
						left: {$rightButtonCoords.x}px;
						top: {$rightButtonCoords.y}px;
						transform: translate(-50%, -50%);
					"
					onclick={() => goto(`/photos/${album.slug}/${navigation.nextPhoto.id}`)}
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
			backHref={`/photos/${album.slug}`}
			backLabel={`Back to ${album.title}`}
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
		transition:
			background 0.2s ease,
			box-shadow 0.2s ease;

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
