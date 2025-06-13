<script lang="ts">
	import PhotoGrid from '$components/PhotoGrid.svelte'
	import BackButton from '$components/BackButton.svelte'
	import { generateMetaTags, generateImageGalleryJsonLd } from '$lib/utils/metadata'
	import { page } from '$app/stores'
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()

	const type = $derived(data.type)
	const album = $derived(data.album)
	const photo = $derived(data.photo)
	const error = $derived(data.error)

	// Transform album data to PhotoItem format for PhotoGrid
	const photoItems = $derived(
		album?.photos?.map((photo: any) => ({
			id: `photo-${photo.id}`,
			src: photo.url,
			alt: photo.caption || photo.filename,
			caption: photo.caption,
			width: photo.width || 400,
			height: photo.height || 400
		})) ?? []
	)

	const formatDate = (dateString: string) => {
		const date = new Date(dateString)
		return date.toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		})
	}

	const pageUrl = $derived($page.url.href)

	// Generate metadata
	const metaTags = $derived(
		type === 'album' && album
			? generateMetaTags({
					title: album.title,
					description:
						album.description ||
						`Photo album: ${album.title}${album.location ? ` taken in ${album.location}` : ''}`,
					url: pageUrl,
					image: album.photos?.[0]?.url,
					titleFormat: { type: 'by' }
				})
			: type === 'photo' && photo
				? generateMetaTags({
						title: photo.title || 'Photo',
						description: photo.description || photo.caption || 'A photograph',
						url: pageUrl,
						image: photo.url,
						titleFormat: { type: 'by' }
					})
				: generateMetaTags({
						title: 'Not Found',
						description: 'The content you are looking for could not be found.',
						url: pageUrl,
						noindex: true
					})
	)

	// Generate image gallery JSON-LD
	const galleryJsonLd = $derived(
		type === 'album' && album
			? generateImageGalleryJsonLd({
					name: album.title,
					description: album.description,
					url: pageUrl,
					images:
						album.photos?.map((photo: any) => ({
							url: photo.url,
							caption: photo.caption
						})) || []
				})
			: type === 'photo' && photo
				? {
						'@context': 'https://schema.org',
						'@type': 'ImageObject',
						name: photo.title || 'Photo',
						description: photo.description || photo.caption,
						contentUrl: photo.url,
						url: pageUrl
					}
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

	<!-- Canonical URL -->
	<link rel="canonical" href={metaTags.other.canonical} />

	<!-- JSON-LD -->
	{#if galleryJsonLd}
		{@html `<script type="application/ld+json">${JSON.stringify(galleryJsonLd)}</script>`}
	{/if}
</svelte:head>

{#if error}
	<div class="error-container">
		<div class="error-message">
			<h1>Not Found</h1>
			<p>{error}</p>
			<BackButton href="/photos" label="Back to Photos" />
		</div>
	</div>
{:else if type === 'album' && album}
	<div class="album-page">
		<!-- Album Card -->
		<div class="album-card">
			<h1 class="album-title">{album.title}</h1>

			{#if album.description}
				<p class="album-description">{album.description}</p>
			{/if}

			<div class="album-meta">
				{#if album.date}
					<span class="meta-item">📅 {formatDate(album.date)}</span>
				{/if}
				{#if album.location}
					<span class="meta-item">📍 {album.location}</span>
				{/if}
				<span class="meta-item"
					>📷 {album.photos?.length || 0} photo{(album.photos?.length || 0) !== 1 ? 's' : ''}</span
				>
			</div>
		</div>

		<!-- Photo Grid -->
		{#if photoItems.length > 0}
			<PhotoGrid {photoItems} albumSlug={album.slug} />
		{:else}
			<div class="empty-album">
				<p>This album doesn't contain any photos yet.</p>
			</div>
		{/if}
	</div>
{:else if type === 'photo' && photo}
	<div class="photo-page">
		<div class="photo-header">
			<BackButton href="/photos" label="Back to Photos" />
		</div>

		<div class="photo-container">
			<img src={photo.url} alt={photo.title || photo.caption || 'Photo'} class="photo-image" />
		</div>

		<div class="photo-info">
			{#if photo.title}
				<h1 class="photo-title">{photo.title}</h1>
			{/if}

			{#if photo.caption || photo.description}
				<p class="photo-description">{photo.caption || photo.description}</p>
			{/if}

			{#if photo.exifData}
				<div class="photo-exif">
					<!-- EXIF data could be displayed here -->
				</div>
			{/if}
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

	.album-page {
		width: 100%;
		max-width: 900px;
		margin: 0 auto;
		padding: 0 $unit-3x;

		@include breakpoint('phone') {
			padding: $unit-3x $unit-2x;
		}
	}

	.album-card {
		background: $grey-100;
		border: 1px solid $grey-90;
		border-radius: $card-corner-radius;
		padding: $unit-6x;
		margin-bottom: $unit-3x;
		text-align: center;

		@include breakpoint('tablet') {
			margin-bottom: $unit-2x;
		}

		@include breakpoint('phone') {
			padding: $unit-4x $unit-3x;
		}
	}

	.album-title {
		font-size: 2.25rem;
		font-weight: 700;
		margin: 0 0 $unit-2x;
		color: $grey-10;

		@include breakpoint('phone') {
			font-size: 1.875rem;
		}
	}

	.album-description {
		font-size: 1rem;
		color: $grey-30;
		margin: 0 0 $unit-4x;
		line-height: 1.5;
		max-width: 600px;
		margin-left: auto;
		margin-right: auto;

		@include breakpoint('phone') {
			font-size: 1rem;
			margin-bottom: $unit-3x;
		}
	}

	.album-meta {
		display: flex;
		justify-content: center;
		gap: $unit-3x;
		flex-wrap: wrap;

		.meta-item {
			font-size: 0.875rem;
			color: $grey-40;
			display: flex;
			align-items: center;
			gap: $unit-half;
		}

		@include breakpoint('phone') {
			gap: $unit-2x;
		}
	}

	.empty-album {
		text-align: center;
		padding: $unit-6x $unit-3x;
		color: $grey-40;
	}

	.photo-page {
		width: 100%;
		max-width: 1200px;
		margin: 0 auto;
		padding: $unit-4x $unit-3x;

		@include breakpoint('phone') {
			padding: $unit-3x $unit-2x;
		}
	}

	.photo-header {
		margin-bottom: $unit-3x;
	}

	.photo-container {
		margin-bottom: $unit-4x;
		text-align: center;

		.photo-image {
			max-width: 100%;
			height: auto;
			border-radius: $card-corner-radius;
			box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
		}
	}

	.photo-info {
		max-width: 700px;
		margin: 0 auto;
		text-align: center;

		.photo-title {
			font-size: 2rem;
			font-weight: 700;
			margin: 0 0 $unit-2x;
			color: $grey-10;

			@include breakpoint('phone') {
				font-size: 1.5rem;
			}
		}

		.photo-description {
			font-size: 1rem;
			color: $grey-30;
			line-height: 1.6;
			margin: 0 0 $unit-3x;
		}
	}
</style>
