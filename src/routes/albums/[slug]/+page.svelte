<script lang="ts">
	import { generateAlbumJsonLd, type AlbumPhoto } from '$lib/public/album-metadata'
	import Page from '$components/Page.svelte'
	import PhotoGrid from '$components/PhotoGrid.svelte'
	import BackButton from '$components/BackButton.svelte'
	import HeartButton from '$components/HeartButton.svelte'
	import { generateMetaTags } from '$lib/utils/metadata'
	import AlbumBody from '$lib/components/public/AlbumBody.svelte'
	import { getContentExcerpt } from '$lib/utils/content/excerpts'
	import { page } from '$app/stores'
	import type { PageData } from './$types'
	import type { EditorData } from '$lib/types/editor'

	let { data }: { data: PageData } = $props()

	const album = $derived(data.album)
	const error = $derived(data.error)

	// Transform album data to PhotoItem format for MasonryPhotoGrid
	const photoItems = $derived(
		album?.photos?.map((photo: AlbumPhoto) => ({
			id: `photo-${photo.id}`,
			src: photo.url,
			alt: photo.caption || photo.filename,
			caption: photo.caption,
			width: photo.width || 400,
			height: photo.height || 400
		})) ?? []
	)

	const pageUrl = $derived($page.url.href)

	// Helper to get content preview using Edra content excerpt utility
	const extractContentPreview = (content: EditorData | null): string => {
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

	// Generate image gallery JSON-LD
	const galleryJsonLd = $derived(album ? generateAlbumJsonLd(album, pageUrl) : null)

	const galleryJsonLdScript = $derived(
		galleryJsonLd
			? `<script type="application/ld+json">${JSON.stringify(galleryJsonLd)}\u003c/script>`
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
	{#if galleryJsonLdScript}
		{@html galleryJsonLdScript}
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
					<AlbumBody content={album.content} slug={album.slug} />
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

			<footer class="album-footer">
				<BackButton href="/photos" label="Back to Photos" />
				<HeartButton path="albums/{album.slug}" />
			</footer>
		</Page>
	</div>
{/if}

<style lang="scss">
	/* Container Styles */
	.error-container,
	.album-wrapper {
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

	.album-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: $unit-2x 0;
	}

	.empty-album {
		text-align: center;
		padding: $unit-6x 0;
		color: $gray-40;
	}
</style>
