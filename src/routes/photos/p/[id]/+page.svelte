<script lang="ts">
	import BackButton from '$components/BackButton.svelte'
	import { generateMetaTags } from '$lib/utils/metadata'
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { onMount } from 'svelte'
	import type { PageData } from './$types'
	import { isAlbum } from '$lib/types/photos'

	let { data }: { data: PageData } = $props()

	const photo = $derived(data.photo)
	const error = $derived(data.error)
	const photoItems = $derived(data.photoItems || [])
	const currentPhotoId = $derived(data.currentPhotoId)
	
	let showModal = $state(false)

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

	// Get adjacent photos for filmstrip - always show 5 when possible
	const filmstripItems = $derived(() => {
		if (!photoItems.length || !currentPhotoId) return []
		
		const currentIndex = photoItems.findIndex(item => item.id === currentPhotoId)
		if (currentIndex === -1) return []
		
		const targetCount = 5
		const halfCount = Math.floor(targetCount / 2)
		
		let start = currentIndex - halfCount
		let end = currentIndex + halfCount + 1
		
		// Adjust if we're near the beginning
		if (start < 0) {
			end = Math.min(photoItems.length, end - start)
			start = 0
		}
		
		// Adjust if we're near the end
		if (end > photoItems.length) {
			start = Math.max(0, start - (end - photoItems.length))
			end = photoItems.length
		}
		
		// Ensure we always get up to targetCount items if available
		const itemsCount = end - start
		if (itemsCount < targetCount && photoItems.length >= targetCount) {
			if (start === 0) {
				end = Math.min(targetCount, photoItems.length)
			} else {
				start = Math.max(0, photoItems.length - targetCount)
			}
		}
		
		return photoItems.slice(start, end)
	})

	// Handle filmstrip navigation
	function handleFilmstripClick(item: any) {
		if (isAlbum(item)) {
			goto(`/photos/${item.slug}`)
		} else {
			const photoId = item.id.replace('photo-', '')
			goto(`/photos/p/${photoId}`)
		}
	}

	// Modal handlers
	function openModal() {
		showModal = true
		document.body.style.overflow = 'hidden'
	}

	function closeModal() {
		showModal = false
		document.body.style.overflow = ''
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && showModal) {
			closeModal()
		}
	}

	// Set up keyboard listener
	$effect(() => {
		if (showModal) {
			window.addEventListener('keydown', handleKeydown)
			return () => window.removeEventListener('keydown', handleKeydown)
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
		<button class="photo-container" onclick={openModal} type="button">
			<img src={photo.url} alt={photo.title || photo.caption || 'Photo'} class="photo-image" />
		</button>

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

		<!-- Filmstrip Navigation -->
		<div class="filmstrip-card">
			<div class="filmstrip-container">
				{#each filmstripItems() as item}
					<button 
						class="filmstrip-item" 
						class:selected={item.id === currentPhotoId}
						onclick={() => handleFilmstripClick(item)}
						type="button"
					>
						{#if isAlbum(item)}
							<img 
								src={item.coverPhoto.src} 
								alt={item.title}
								class="filmstrip-image"
							/>
							<div class="album-indicator">
								<span class="album-count">{item.photos.length}</span>
							</div>
						{:else}
							<img 
								src={item.src} 
								alt={item.alt}
								class="filmstrip-image"
							/>
						{/if}
					</button>
				{/each}
			</div>
			
			<div class="card-footer">
				<BackButton
					href={photo.album ? `/photos/${photo.album.slug}` : '/photos'}
					label={photo.album ? `Back to ${photo.album.title}` : 'Back to Photos'}
				/>
			</div>
		</div>
	</div>

	<!-- Photo Modal -->
	{#if showModal}
		<div 
			class="photo-modal" 
			onclick={closeModal}
			role="dialog"
			aria-modal="true"
			aria-label="Full size photo"
		>
			<div class="modal-content">
				<img 
					src={photo.url} 
					alt={photo.title || photo.caption || 'Photo'} 
					class="modal-image"
					onclick={closeModal}
				/>
			</div>
		</div>
	{/if}
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

	.photo-container {
		max-width: 700px;
		width: 100%;
		font-size: 0;
		line-height: 0;
		border: none;
		padding: 0;
		background: none;
		cursor: zoom-in;
		position: relative;

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

		&:focus-visible {
			outline: none;

			&::before {
				border-color: $red-60;
			}

			&::after {
				border-color: $grey-100;
			}
		}

		&:hover {
			.photo-image {
				opacity: 0.95;
			}
		}

		.photo-image {
			display: block;
			max-width: 100%;
			width: 100%;
			height: auto;
			object-fit: contain;
			border-radius: $image-corner-radius;
			box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
			transition: opacity 0.2s ease;

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

	// Filmstrip Navigation
	.filmstrip-card {
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

	.filmstrip-container {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: $unit-2x;
		margin-bottom: $unit-2x;
		padding: $unit 0;

		@include breakpoint('phone') {
			gap: $unit;
		}
	}

	.filmstrip-item {
		flex: 0 0 auto;
		height: 100px;
		position: relative;
		border: none;
		padding: 0;
		background: none;
		cursor: pointer;
		border-radius: $corner-radius-md;
		overflow: hidden;
		transition: all 0.2s ease;
		opacity: 0.6;

		&::before {
			content: '';
			position: absolute;
			inset: 0;
			border-radius: $corner-radius-md;
			border: 3px solid transparent;
			z-index: 2;
			pointer-events: none;
			transition: border-color 0.2s ease;
		}

		&::after {
			content: '';
			position: absolute;
			inset: 3px;
			border-radius: calc($corner-radius-md - 3px);
			border: 2px solid transparent;
			z-index: 3;
			pointer-events: none;
			transition: border-color 0.2s ease;
		}

		&:hover {
			opacity: 1;
			transform: scale(1.02);
		}

		&.selected {
			opacity: 1;

			&::before {
				border-color: $red-60;
			}

			&::after {
				border-color: $grey-100;
			}
		}

		@include breakpoint('phone') {
			height: 70px;
		}
	}

	.filmstrip-image {
		height: 100%;
		width: auto;
		object-fit: cover;
		display: block;
	}

	.album-indicator {
		position: absolute;
		bottom: $unit-half;
		right: $unit-half;
		background: rgba(0, 0, 0, 0.7);
		color: white;
		padding: 2px 6px;
		border-radius: $corner-radius-xs;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.card-footer {
		display: flex;
		justify-content: center;
	}

	// Modal styles
	.photo-modal {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		cursor: zoom-out;
		padding: $unit-2x;
		box-sizing: border-box;
	}

	.modal-content {
		position: relative;
		max-width: 95vw;
		max-height: 95vh;
		cursor: default;
	}

	.modal-image {
		display: block;
		width: auto;
		height: auto;
		max-width: 100%;
		max-height: 95vh;
		object-fit: contain;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
		cursor: zoom-out;
	}
</style>
