<script lang="ts">
	import Page from '$components/Page.svelte'
	import PhotoGrid from '$components/PhotoGrid.svelte'
	import BackButton from '$components/BackButton.svelte'
	import { generateMetaTags, generateImageGalleryJsonLd } from '$lib/utils/metadata'
	import { renderEdraContent, getContentExcerpt } from '$lib/utils/content'
	import { page } from '$app/stores'
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()

	const album = $derived(data.album)
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
		album
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
			: generateMetaTags({
					title: 'Not Found',
					description: 'The album you are looking for could not be found.',
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
	const galleryJsonLd = $derived(album ? generateAlbumJsonLd(album, pageUrl) : null)
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
{:else if album}
	<div class="album-wrapper">
		<Page>
			<!-- Album Content -->
			{#if album.content}
				<div class="album-content">
					<div class="edra-rendered-content">
						{@html renderEdraContent(album.content, { albumSlug: album.slug })}
					</div>
				</div>
			{:else}
				<!-- Legacy Photo Grid (for albums without composed content) -->
				{#if photoItems.length > 0}
					<div class="legacy-photos">
						<PhotoGrid photos={photoItems} columns="auto" masonry={true} gap="medium" />
					</div>
				{:else}
					<div class="empty-album">
						<p>This album doesn't contain any photos yet.</p>
					</div>
				{/if}
			{/if}
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
			color: $gray-40;
			margin: 0 0 $unit-4x;
			line-height: 1.5;
		}
	}

	/* Album Styles */
	.album-content {
		padding: $unit-2x 0;
	}

	.legacy-photos {
		padding: $unit-2x 0;
	}

	.empty-album {
		text-align: center;
		padding: $unit-6x 0;
		color: $gray-40;
	}

	.edra-rendered-content {
		max-width: 700px;
		margin: 0 auto;

		:global(p) {
			margin: 0 0 $unit-3x;
			line-height: 1.7;
			color: $gray-20;
		}

		:global(h1),
		:global(h2),
		:global(h3),
		:global(h4) {
			margin: $unit-4x 0 $unit-2x;
			color: $gray-10;
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
			background: $gray-97;
			border-left: 4px solid $gray-80;
			border-radius: $unit;
			color: $gray-30;
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
			background: $gray-95;
			padding: 2px 6px;
			border-radius: 3px;
			font-family: 'SF Mono', Monaco, monospace;
			font-size: 0.875em;
		}

		:global(pre) {
			background: $gray-95;
			padding: $unit-3x;
			border-radius: $unit;
			overflow-x: auto;
			margin: 0 0 $unit-3x;
		}

		:global(hr) {
			margin: $unit-4x 0;
			border: none;
			border-top: 1px solid $gray-90;
		}

		:global(figure) {
			margin: $unit-4x 0;
			text-align: center;
		}

		:global(figure img) {
			width: 100%;
			height: auto;
			border-radius: $card-corner-radius;
			display: block;
		}

		:global(figure.interactive-figure .photo-link) {
			display: block;
			text-decoration: none;
			color: inherit;
			outline: none;
			cursor: pointer;
			transition: transform 0.2s ease;
			border-radius: $card-corner-radius;
			overflow: hidden;
		}

		:global(figure.interactive-figure .photo-link:hover) {
			transform: translateY(-2px);
		}

		:global(figure.interactive-figure .photo-link:focus-visible) {
			outline: 2px solid $red-60;
			outline-offset: 4px;
		}

		:global(figure figcaption) {
			margin-top: $unit;
			font-size: 0.875rem;
			color: $gray-40;
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
			color: $gray-10;

			@include breakpoint('phone') {
				font-size: 1.5rem;
			}
		}

		.photo-description {
			font-size: 1rem;
			color: $gray-30;
			line-height: 1.6;
			margin: 0;
			max-width: 600px;
			margin-left: auto;
			margin-right: auto;
		}
	}
</style>
