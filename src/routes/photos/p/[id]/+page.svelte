<script lang="ts">
	import BackButton from '$components/BackButton.svelte'
	import { generateMetaTags } from '$lib/utils/metadata'
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { onMount } from 'svelte'
	import type { PageData } from './$types'
	import { isAlbum } from '$lib/types/photos'
	import Zoom from 'svelte-medium-image-zoom'
	import 'svelte-medium-image-zoom/dist/styles.css'

	let { data }: { data: PageData } = $props()

	const photo = $derived(data.photo)
	const error = $derived(data.error)
	const photoItems = $derived(data.photoItems || [])
	const currentPhotoId = $derived(data.currentPhotoId)

	const pageUrl = $derived($page.url.href)

	const formatDate = (dateString: string) => {
		const date = new Date(dateString)
		return date.toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		})
	}

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
		const photosOnly = photoItems.filter(item => !isAlbum(item))
		const currentIndex = photosOnly.findIndex(item => item.id === currentPhotoId)
		
		if (currentIndex === -1) return { prev: null, next: null }
		
		return {
			prev: currentIndex > 0 ? photosOnly[currentIndex - 1] : null,
			next: currentIndex < photosOnly.length - 1 ? photosOnly[currentIndex + 1] : null
		}
	})

	// Handle photo navigation
	function navigateToPhoto(item: any) {
		if (!item) return
		const photoId = item.id.replace('photo-', '')
		goto(`/photos/p/${photoId}`)
	}

	function handleKeydown(e: KeyboardEvent) {
		// Arrow key navigation for photos
		if (e.key === 'ArrowLeft' && adjacentPhotos().prev) {
			navigateToPhoto(adjacentPhotos().prev)
		} else if (e.key === 'ArrowRight' && adjacentPhotos().next) {
			navigateToPhoto(adjacentPhotos().next)
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
	<div class="photo-page">
		<div class="photo-content-wrapper">
			<div class="photo-container">
				<Zoom>
					<img src={photo.url} alt={photo.title || photo.caption || 'Photo'} class="photo-image" />
				</Zoom>
			</div>

			<!-- Adjacent Photos Navigation (Desktop Only) -->
			<div class="adjacent-photos">
				{#if adjacentPhotos().prev}
					<button 
						class="adjacent-photo prev"
						onclick={() => navigateToPhoto(adjacentPhotos().prev)}
						type="button"
						aria-label="Previous photo"
					>
						<img 
							src={adjacentPhotos().prev.src} 
							alt={adjacentPhotos().prev.alt}
							class="adjacent-image"
						/>
					</button>
				{:else}
					<div class="adjacent-placeholder"></div>
				{/if}

				{#if adjacentPhotos().next}
					<button 
						class="adjacent-photo next"
						onclick={() => navigateToPhoto(adjacentPhotos().next)}
						type="button"
						aria-label="Next photo"
					>
						<img 
							src={adjacentPhotos().next.src} 
							alt={adjacentPhotos().next.alt}
							class="adjacent-image"
						/>
					</button>
				{:else}
					<div class="adjacent-placeholder"></div>
				{/if}
			</div>
		</div>

		<div class="photo-info-card">
			{#if photo.title || photo.caption || photo.description}
				<div class="photo-details">
					{#if photo.title}
						<h1 class="photo-title">{photo.title}</h1>
					{/if}

					{#if photo.caption || photo.description}
						<p class="photo-description">{photo.caption || photo.description}</p>
					{/if}
				</div>
			{/if}

			{#if exifData || photo.createdAt}
				<div class="metadata-grid">
					{#if exifData?.camera}
						<div class="metadata-item">
							<span class="metadata-label">Camera</span>
							<span class="metadata-value">{exifData.camera}</span>
						</div>
					{/if}

					{#if exifData?.lens}
						<div class="metadata-item">
							<span class="metadata-label">Lens</span>
							<span class="metadata-value">{exifData.lens}</span>
						</div>
					{/if}

					{#if exifData?.focalLength}
						<div class="metadata-item">
							<span class="metadata-label">Focal Length</span>
							<span class="metadata-value">{exifData.focalLength}</span>
						</div>
					{/if}

					{#if exifData?.aperture}
						<div class="metadata-item">
							<span class="metadata-label">Aperture</span>
							<span class="metadata-value">{exifData.aperture}</span>
						</div>
					{/if}

					{#if exifData?.shutterSpeed}
						<div class="metadata-item">
							<span class="metadata-label">Shutter Speed</span>
							<span class="metadata-value">{exifData.shutterSpeed}</span>
						</div>
					{/if}

					{#if exifData?.iso}
						<div class="metadata-item">
							<span class="metadata-label">ISO</span>
							<span class="metadata-value">{exifData.iso}</span>
						</div>
					{/if}

					{#if exifData?.dateTaken}
						<div class="metadata-item">
							<span class="metadata-label">Date Taken</span>
							<span class="metadata-value">{formatDate(exifData.dateTaken)}</span>
						</div>
					{:else if photo.createdAt}
						<div class="metadata-item">
							<span class="metadata-label">Date</span>
							<span class="metadata-value">{formatDate(photo.createdAt)}</span>
						</div>
					{/if}

					{#if exifData?.location}
						<div class="metadata-item">
							<span class="metadata-label">Location</span>
							<span class="metadata-value">{exifData.location}</span>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Navigation Footer -->
		<div class="navigation-footer">
			<BackButton
				href={photo.album ? `/photos/${photo.album.slug}` : '/photos'}
				label={photo.album ? `Back to ${photo.album.title}` : 'Back to Photos'}
			/>
		</div>
	</div>
{/if}

<style lang="scss">
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
	}

	.photo-container {
		max-width: 700px;
		width: 100%;
		font-size: 0;
		line-height: 0;
		position: relative;

		.photo-image {
			display: block;
			max-width: 100%;
			width: 100%;
			height: auto;
			object-fit: contain;
			border-radius: $image-corner-radius;
			box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);

			@include breakpoint('phone') {
				border-radius: $image-corner-radius;
			}
		}
	}

	.photo-info-card {
		background: $grey-100;
		border: 1px solid $grey-90;
		border-radius: $image-corner-radius;
		padding: $unit-4x;
		max-width: 700px;
		margin: 0 auto;
		width: 100%;
		box-sizing: border-box;

		@include breakpoint('phone') {
			padding: $unit-3x;
			max-width: 100%;
		}
	}

	.photo-details {
		margin-bottom: $unit-4x;
		padding-bottom: $unit-4x;
		border-bottom: 1px solid $grey-90;
		text-align: center;

		@include breakpoint('phone') {
			margin-bottom: $unit-3x;
			padding-bottom: $unit-3x;
		}

		.photo-title {
			font-size: 1.75rem;
			font-weight: 600;
			margin: 0 0 $unit-2x;
			color: $grey-10;

			@include breakpoint('phone') {
				font-size: 1.25rem;
				margin-bottom: $unit;
			}
		}

		.photo-description {
			font-size: 1rem;
			color: $grey-30;
			line-height: 1.6;
			margin: 0;

			@include breakpoint('phone') {
				font-size: 0.875rem;
			}
		}
	}

	.metadata-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: $unit-3x;

		@include breakpoint('phone') {
			grid-template-columns: 1fr;
			gap: $unit-2x;
		}
	}

	.metadata-item {
		display: flex;
		flex-direction: column;
		gap: $unit-half;

		.metadata-label {
			font-size: 0.75rem;
			font-weight: 600;
			text-transform: uppercase;
			letter-spacing: 0.05em;
			color: $grey-40;
		}

		.metadata-value {
			font-size: 0.875rem;
			color: $grey-10;
			font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New',
				monospace;
		}
	}

	// Navigation Footer
	.navigation-footer {
		display: flex;
		justify-content: center;
		max-width: 700px;
		margin: 0 auto;
		width: 100%;
	}

	// Adjacent Photos Navigation
	.adjacent-photos {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: calc(100% + 400px); // Add space for the adjacent images
		display: flex;
		justify-content: space-between;
		align-items: center;
		pointer-events: none;
		z-index: 10;

		// Hide on mobile and tablet
		@include breakpoint('tablet') {
			display: none;
		}
	}

	.adjacent-photo,
	.adjacent-placeholder {
		width: 200px;
		height: 300px;
		pointer-events: auto;
	}

	.adjacent-photo {
		position: relative;
		border: none;
		padding: 0;
		background: none;
		cursor: pointer;
		border-radius: $image-corner-radius;
		overflow: hidden;
		transition: all 0.3s ease;
		opacity: 0.3;
		filter: grayscale(100%);

		&.prev {
			transform: translateX(-25%);
		}

		&.next {
			transform: translateX(25%);
		}

		&::before {
			content: '';
			position: absolute;
			inset: -3px;
			border-radius: $image-corner-radius;
			border: 3px solid transparent;
			z-index: 2;
			pointer-events: none;
			transition: border-color 0.2s ease;
		}

		&::after {
			content: '';
			position: absolute;
			inset: 0;
			border-radius: $image-corner-radius;
			border: 2px solid transparent;
			z-index: 3;
			pointer-events: none;
			transition: border-color 0.2s ease;
		}

		&:hover {
			opacity: 0.6;
			filter: grayscale(50%);
			transform: scale(1.02) translateX(-25%);

			&.next {
				transform: scale(1.02) translateX(25%);
			}
		}

		&:focus-visible {
			outline: none;

			&::before {
				border-color: $red-60;
			}

			&::after {
				border-color: $grey-100;
			}
		}
	}

	.adjacent-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
</style>
