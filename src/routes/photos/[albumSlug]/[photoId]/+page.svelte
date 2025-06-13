<script lang="ts">
	import BackButton from '$components/BackButton.svelte'
	import PhotoView from '$components/PhotoView.svelte'
	import PhotoMetadata from '$components/PhotoMetadata.svelte'
	import { generateMetaTags, generateCreativeWorkJsonLd } from '$lib/utils/metadata'
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import type { PageData } from './$types'
	import ArrowLeft from '$icons/arrow-left.svg'
	import ArrowRight from '$icons/arrow-right.svg'

	let { data }: { data: PageData } = $props()

	const photo = $derived(data.photo)
	const album = $derived(data.album)
	const navigation = $derived(data.navigation)
	const error = $derived(data.error)


	const formatExif = (exifData: any) => {
		if (!exifData) return null

		const formatSpeed = (speed: string) => {
			if (speed?.includes('/')) return speed
			if (speed?.includes('s')) return speed
			return speed ? `1/${speed}s` : null
		}

		return {
			camera: exifData.camera,
			lens: exifData.lens,
			settings: [
				exifData.focalLength,
				exifData.aperture,
				formatSpeed(exifData.shutterSpeed),
				exifData.iso ? `ISO ${exifData.iso}` : null
			]
				.filter(Boolean)
				.join(' • '),
			location: exifData.location,
			dateTaken: exifData.dateTaken
		}
	}

	const exif = $derived(photo ? formatExif(photo.exifData) : null)
	const pageUrl = $derived($page.url.href)
	
	// Parse EXIF data if available (same as photo detail page)
	const exifData = $derived(
		photo?.exifData && typeof photo.exifData === 'object' ? photo.exifData : null
	)
	
	// Debug: Log what data we have
	$effect(() => {
		if (photo) {
			console.log('Photo data:', {
				id: photo.id,
				title: photo.title,
				caption: photo.caption,
				exifData: photo.exifData,
				createdAt: photo.createdAt
			})
		}
	})

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
					publishedTime: exif?.dateTaken,
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
					dateCreated: exif?.dateTaken,
					keywords: ['photography', album.title, ...(exif?.location ? [exif.location] : [])]
				})
			: null
	)
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
		<div class="error-content">
			<h1>Photo Not Found</h1>
			<p>{error || "The photo you're looking for doesn't exist."}</p>
			<BackButton href="/photos" label="Back to Photos" />
		</div>
	</div>
{:else}
	<div class="photo-page">
		<div class="photo-content-wrapper">
			<PhotoView 
				src={photo.url} 
				alt={photo.caption} 
				title={photo.title}
				id={photo.id}
			/>

			<!-- Adjacent Photos Navigation -->
			<div class="adjacent-navigation">
				{#if navigation.prevPhoto}
					<button
						class="nav-button prev"
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
						onclick={() => goto(`/photos/${album.slug}/${navigation.nextPhoto.id}`)}
						type="button"
						aria-label="Next photo"
					>
						<ArrowRight class="nav-icon" />
					</button>
				{/if}
			</div>
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

	.error-content {
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
	}

	// Adjacent Navigation
	.adjacent-navigation {
		position: absolute;
		top: 0;
		bottom: 0;
		left: calc(-48px - #{$unit-2x});
		right: calc(-48px - #{$unit-2x});
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
		position: relative;
		border: none;
		padding: 0;
		background: $grey-100;
		cursor: pointer;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

		&:hover {
			background: $grey-95;
			transform: scale(1.1);
			box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
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

		&.prev {
			margin-right: auto;
		}

		&.next {
			margin-left: auto;
		}
	}
</style>
