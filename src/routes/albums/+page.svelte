<script lang="ts">
	import { onDestroy, untrack } from 'svelte'
	import { createPagedFeed, type FeedState } from '$lib/public/paged-feed'
	import { loadPublicAlbums } from '$lib/public/feed-requests'
	import type { PublicAlbum } from '$lib/public/types'
	import AlbumPreview from '$lib/components/public/AlbumPreview.svelte'
	import FeedLoader from '$lib/components/public/FeedLoader.svelte'
	import { LoaderState } from 'svelte-infinite'
	import { generateMetaTags } from '$lib/utils/metadata'
	import { page } from '$app/stores'
	import type { PageData } from './$types'

	const { data }: { data: PageData } = $props()

	// Initialize loader state
	const loaderState = new LoaderState()

	const error = $derived(data.error)
	const pageUrl = $derived($page.url.href)
	let feed = $state<FeedState<PublicAlbum>>({
		items: data.albums || [],
		offset: data.pagination?.limit || 20,
		hasMore: !!data.pagination?.hasMore,
		loading: false,
		loadingAll: false,
		error: ''
	})
	const collection = createPagedFeed({
		initial: untrack(() => feed),
		key: (album: PublicAlbum) => album.id,
		load: loadPublicAlbums,
		changed: (next) => {
			feed = next
		}
	})
	const allAlbums = $derived(feed.items)
	const lastError = $derived(feed.error)
	async function loadMore() {
		await collection.loadMore()
		if (feed.error) loaderState.error()
		else if (!feed.hasMore) loaderState.complete()
		else loaderState.loaded()
	}
	onDestroy(() => collection.dispose())
	$effect(() => {
		if (!feed.hasMore) loaderState.complete()
	})

	// Generate metadata for albums page
	const metaTags = $derived(
		generateMetaTags({
			title: 'Photo Albums',
			description:
				'A collection of photographic stories and visual essays from travels and projects.',
			url: pageUrl
		})
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
</svelte:head>

<div class="albums-container">
	<header class="page-header">
		<h1>Photo Albums</h1>
		<p class="page-description">Collections of photographic stories and visual essays</p>
	</header>

	{#if error}
		<div class="error-container">
			<div class="error-message">
				<h2>Unable to load albums</h2>
				<p>{error}</p>
			</div>
		</div>
	{:else if allAlbums.length === 0}
		<div class="empty-container">
			<div class="empty-message">
				<h2>No albums yet</h2>
				<p>Photo albums will be added soon</p>
			</div>
		</div>
	{:else}
		<div class="albums-grid">
			{#each allAlbums as album}
				<AlbumPreview {album} />
			{/each}
		</div>

		<FeedLoader {loaderState} {loadMore} {lastError} noun="albums" />
	{/if}
</div>

<style lang="scss">
	.albums-container {
		width: 100%;
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 $unit-3x;

		@include breakpoint('phone') {
			padding: 0 $unit-2x;
		}
	}

	.page-header {
		text-align: center;
		margin-bottom: $unit-6x;

		h1 {
			font-size: 2.5rem;
			font-weight: 700;
			margin: 0 0 $unit-2x;
			color: $gray-10;

			@include breakpoint('phone') {
				font-size: 2rem;
			}
		}

		.page-description {
			font-size: 1.125rem;
			color: $gray-40;
			margin: 0;
			max-width: 600px;
			margin-left: auto;
			margin-right: auto;

			@include breakpoint('phone') {
				font-size: 1rem;
			}
		}
	}

	.albums-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
		gap: $unit-4x;
		margin-bottom: $unit-6x;

		@include breakpoint('tablet') {
			grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
			gap: $unit-3x;
		}

		@include breakpoint('phone') {
			grid-template-columns: 1fr;
			gap: $unit-3x;
		}
	}

	.error-container,
	.empty-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 60vh;
	}

	.error-message,
	.empty-message {
		text-align: center;
		max-width: 500px;

		h2 {
			font-size: 1.5rem;
			font-weight: 600;
			margin: 0 0 $unit-2x;
			color: $gray-10;
		}

		p {
			margin: 0;
			color: $gray-40;
			line-height: 1.5;
		}
	}

	.error-message {
		h2 {
			color: $red-60;
		}
	}
</style>
