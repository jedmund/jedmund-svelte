<script lang="ts">
	import Page from '$components/Page.svelte'
	import MasonryPhotoGrid from '$components/MasonryPhotoGrid.svelte'
	import BackButton from '$components/BackButton.svelte'
	import { generateMetaTags, generateImageGalleryJsonLd } from '$lib/utils/metadata'
	import { renderEdraContent, getContentExcerpt } from '$lib/utils/content'
	import { page } from '$app/stores'
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()

	const type = $derived(data.type)
	const album = $derived(data.album)
	const photo = $derived(data.photo)
	const error = $derived(data.error)

	// Transform album data to PhotoItem format for MasonryPhotoGrid
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

	// Helper to get content preview using Edra content excerpt utility
	const extractContentPreview = (content: any): string => {
		if (!content) return ''
		return getContentExcerpt(content, 155)
	}

	// Generate metadata
	const metaTags = $derived(
		type === 'album' && album
			? generateMetaTags({
					title: album.title,
					description: album.content
						? extractContentPreview(album.content) ||
							album.description ||
							`Photo story: ${album.title}`
						: album.description ||
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

	// Generate enhanced JSON-LD for albums with content
	const generateAlbumJsonLd = (album: any, pageUrl: string) => {
		const baseJsonLd = generateImageGalleryJsonLd({
			name: album.title,
			description: album.description,
			url: pageUrl,
			images:
				album.photos?.map((photo: any) => ({
					url: photo.url,
					caption: photo.caption
				})) || []
		})

		// Enhance with Article schema if album has composed content
		if (album.content) {
			return {
				'@context': 'https://schema.org',
				'@graph': [
					baseJsonLd,
					{
						'@type': 'Article',
						'@id': `${pageUrl}#article`,
						headline: album.title,
						description: album.description,
						url: pageUrl,
						datePublished: album.date || album.createdAt,
						dateModified: album.updatedAt || album.createdAt,
						author: {
							'@type': 'Person',
							name: 'Justin Edmund',
							url: 'https://jedmund.com'
						},
						publisher: {
							'@type': 'Person',
							name: 'Justin Edmund',
							url: 'https://jedmund.com'
						},
						image: album.photos?.[0]?.url,
						mainEntityOfPage: {
							'@type': 'WebPage',
							'@id': pageUrl
						}
					}
				]
			}
		}

		return baseJsonLd
	}

	// Generate image gallery JSON-LD
	const galleryJsonLd = $derived(
		type === 'album' && album
			? generateAlbumJsonLd(album, pageUrl)
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
		<Page>
			<div class="error-message">
				<h1>Not Found</h1>
				<p>{error}</p>
				<BackButton href="/photos" label="Back to Photos" />
			</div>
		</Page>
	</div>
{:else if type === 'album' && album}
	<div class="album-wrapper">
		<Page>
			{#snippet header()}
				<div class="album-header">
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
			{/snippet}

			<!-- Album Content -->
			{#if album.content}
				<div class="album-content">
					<div class="edra-rendered-content">
						{@html renderEdraContent(album.content)}
					</div>
				</div>
			{:else}
				<!-- Legacy Photo Grid (for albums without composed content) -->
				{#if photoItems.length > 0}
					<div class="legacy-photos">
						<MasonryPhotoGrid {photoItems} albumSlug={album.slug} />
					</div>
				{:else}
					<div class="empty-album">
						<p>This album doesn't contain any photos yet.</p>
					</div>
				{/if}
			{/if}
		</Page>
	</div>
{:else if type === 'photo' && photo}
	<div class="photo-wrapper">
		<Page>
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
		</Page>
	</div>
{/if}

<style lang="scss">
	/* Container Styles */
	.error-container,
	.album-wrapper,
	.photo-wrapper {
		width: 100%;
		max-width: 900px;
		margin: 0 auto;
		padding: 0 $unit-2x;
		box-sizing: border-box;
	}

	.error-message {
		text-align: center;
		padding: $unit-6x 0;

		h1 {
			font-size: 1.75rem;
			font-weight: 600;
			color: $red-60;
			margin: 0 0 $unit-2x;
		}

		p {
			color: $grey-40;
			margin: 0 0 $unit-4x;
			line-height: 1.5;
		}
	}

	/* Album Styles */
	.album-header {
		text-align: center;
		padding-bottom: $unit-3x;
		border-bottom: 1px solid $grey-90;
		margin-bottom: $unit-4x;
	}

	.album-title {
		font-size: 2rem;
		font-weight: 700;
		margin: 0 0 $unit-2x;
		color: $grey-10;

		@include breakpoint('phone') {
			font-size: 1.75rem;
		}
	}

	.album-description {
		font-size: 1rem;
		color: $grey-30;
		margin: 0 0 $unit-3x;
		line-height: 1.5;
		max-width: 600px;
		margin-left: auto;
		margin-right: auto;
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

	.album-content {
		padding: $unit-2x 0;
	}

	.legacy-photos {
		padding: $unit-2x 0;
	}

	.empty-album {
		text-align: center;
		padding: $unit-6x 0;
		color: $grey-40;
	}

	.edra-rendered-content {
		max-width: 700px;
		margin: 0 auto;

		:global(p) {
			margin: 0 0 $unit-3x;
			line-height: 1.7;
			color: $grey-20;
		}

		:global(h1),
		:global(h2),
		:global(h3),
		:global(h4) {
			margin: $unit-4x 0 $unit-2x;
			color: $grey-10;
			font-weight: 600;
		}

		:global(h1) {
			font-size: 2rem;
		}
		:global(h2) {
			font-size: 1.5rem;
		}
		:global(h3) {
			font-size: 1.25rem;
		}
		:global(h4) {
			font-size: 1.125rem;
		}

		:global(ul),
		:global(ol) {
			margin: 0 0 $unit-3x;
			padding-left: $unit-3x;
		}

		:global(ul li),
		:global(ol li) {
			margin-bottom: $unit;
			line-height: 1.7;
		}

		:global(blockquote) {
			margin: $unit-4x 0;
			padding: $unit-3x;
			background: $grey-97;
			border-left: 4px solid $grey-80;
			border-radius: $unit;
			color: $grey-30;
			font-style: italic;
		}

		:global(a) {
			color: $red-60;
			text-decoration: underline;
			transition: color 0.2s ease;
		}

		:global(a:hover) {
			color: $red-50;
		}

		:global(code) {
			background: $grey-95;
			padding: 2px 6px;
			border-radius: 3px;
			font-family: 'SF Mono', Monaco, monospace;
			font-size: 0.875em;
		}

		:global(pre) {
			background: $grey-95;
			padding: $unit-3x;
			border-radius: $unit;
			overflow-x: auto;
			margin: 0 0 $unit-3x;
		}

		:global(hr) {
			margin: $unit-4x 0;
			border: none;
			border-top: 1px solid $grey-90;
		}

		:global(figure) {
			margin: $unit-4x 0;
			text-align: center;
		}

		:global(figure img) {
			max-width: 100%;
			height: auto;
			border-radius: $card-corner-radius;
		}

		:global(figure figcaption) {
			margin-top: $unit;
			font-size: 0.875rem;
			color: $grey-40;
			line-height: 1.5;
		}

		// Gallery styles
		:global(.gallery-grid) {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
			gap: $unit-2x;
			margin: $unit-4x 0;
		}

		// Geolocation styles
		:global(.geolocation-map) {
			margin: $unit-4x 0;
			border-radius: $card-corner-radius;
			overflow: hidden;
			height: 400px;
		}
	}

	/* Photo Page Styles */
	.photo-header {
		margin-bottom: $unit-3x;
	}

	.photo-container {
		margin-bottom: $unit-4x;
		text-align: center;

		.photo-image {
			max-width: 100%;
			height: auto;
			border-radius: $unit;
			box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
		}
	}

	.photo-info {
		text-align: center;

		.photo-title {
			font-size: 1.75rem;
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
			margin: 0;
			max-width: 600px;
			margin-left: auto;
			margin-right: auto;
		}
	}
</style>
