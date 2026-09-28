<script lang="ts">
	import PhotoNavigationControls from '$lib/components/public/PhotoNavigationControls.svelte'
	import BackButton from '$components/BackButton.svelte'
	import HeartButton from '$components/HeartButton.svelte'
	import PhotoViewEnhanced from '$components/PhotoViewEnhanced.svelte'
	import PhotoMetadata from '$components/PhotoMetadata.svelte'
	import { generateMetaTags } from '$lib/utils/metadata'
	import { page } from '$app/stores'
	import { createPhotoNavigation } from '$lib/public/photo-navigation.svelte'
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()

	const photo = $derived(data.photo)
	const error = $derived(data.error)
	const photoItems = $derived(data.photoItems || [])
	const currentPhotoId = $derived(data.currentPhotoId)

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

	const photoJsonLdScript = $derived(
		photoJsonLd
			? `<script type="application/ld+json">${JSON.stringify(photoJsonLd)}\u003c/script>`
			: null
	)

	// Parse EXIF data if available
	const exifData = $derived(
		photo?.exifData && typeof photo.exifData === 'object' ? photo.exifData : null
	)

	const navigation = createPhotoNavigation(() => ({ enabled: !!photo, photoItems, currentPhotoId }))
	const {
		leftButtonCoords,
		rightButtonCoords,
		adjacentPhotos,
		navigateToPhoto,
		handleTouchStart,
		handleTouchEnd,
		handleMouseMove,
		handleMouseLeave
	} = navigation
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
	{#if photoJsonLdScript}
		{@html photoJsonLdScript}
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
		role="presentation"
		onmousemove={handleMouseMove}
		onmouseleave={handleMouseLeave}
	>
		<div class="photo-content-wrapper" ontouchstart={handleTouchStart} ontouchend={handleTouchEnd}>
			<PhotoViewEnhanced
				src={photo.url}
				alt={photo.caption}
				title={photo.title}
				id={photo.id}
				width={photo.width}
				height={photo.height}
			/>
		</div>

		<PhotoNavigationControls
			prev={adjacentPhotos().prev}
			next={adjacentPhotos().next}
			hoveringLeft={navigation.isHoveringLeft}
			hoveringRight={navigation.isHoveringRight}
			leftCoords={$leftButtonCoords}
			rightCoords={$rightButtonCoords}
			{navigateToPhoto}
		/>
		<PhotoMetadata
			title={photo.title}
			caption={photo.caption}
			description={photo.description}
			{exifData}
			createdAt={photo.createdAt}
			albums={photo.albums}
			backHref="/photos"
			backLabel="Back to Photos"
			showBackButton={true}
		>
			{#snippet footerExtra()}
				<HeartButton path="photos/{photo.id}" />
			{/snippet}
		</PhotoMetadata>
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
			color: $gray-40;
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
</style>
