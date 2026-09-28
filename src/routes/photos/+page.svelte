<script lang="ts">
	import FeedLoader from '$lib/components/public/FeedLoader.svelte'
	import { onDestroy, untrack } from 'svelte'
	import { createPagedFeed, type FeedState } from '$lib/public/paged-feed'
	import { loadPublicPhotos } from '$lib/public/feed-requests'
	import PhotoGrid from '$components/PhotoGrid.svelte'
	import HorizontalPhotoScroll from '$components/HorizontalPhotoScroll.svelte'
	import LoadingSpinner from '$components/admin/LoadingSpinner.svelte'
	import ViewModeSelector from '$components/ViewModeSelector.svelte'

	type ViewMode = 'masonry' | 'single' | 'two-column' | 'horizontal'
	import { LoaderState } from 'svelte-infinite'
	import { generateMetaTags } from '$lib/utils/metadata'
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { browser } from '$app/environment'
	import type { PageData } from './$types'
	import type { Photo } from '$lib/types/photos'
	import type { Snapshot } from './$types'

	const { data }: { data: PageData } = $props()

	// Initialize loader state
	const loaderState = new LoaderState()

	let containerWidth = $state<'normal' | 'wide'>('normal')
	const urlMode = $page.url.searchParams.get('view') as ViewMode
	let viewMode = $state<ViewMode>(
		urlMode && ['masonry', 'single', 'two-column', 'horizontal'].includes(urlMode)
			? urlMode
			: 'two-column'
	)
	const error = $derived(data.error)
	const pageUrl = $derived($page.url.href)
	let feed = $state<FeedState<Photo>>({
		items: data.photos || [],
		offset: data.pagination?.limit || 20,
		hasMore: !!data.pagination?.hasMore,
		loading: false,
		loadingAll: false,
		error: ''
	})
	const collection = createPagedFeed({
		initial: untrack(() => feed),
		key: (photo: Photo) => photo.id,
		load: loadPublicPhotos,
		changed: (next) => {
			feed = next
		}
	})
	const allPhotos = $derived(feed.items)
	const currentOffset = $derived(feed.offset)
	const lastError = $derived(feed.error)
	const isLoadingAll = $derived(feed.loadingAll)
	let restoreTimer: ReturnType<typeof setTimeout> | undefined
	onDestroy(() => {
		collection.dispose()
		clearTimeout(restoreTimer)
	})
	function updateLoader() {
		if (feed.error) loaderState.error()
		else if (!feed.hasMore) loaderState.complete()
		else loaderState.loaded()
	}
	async function loadMore() {
		await collection.loadMore()
		updateLoader()
	}
	async function loadAllPhotos() {
		await collection.loadAll()
		updateLoader()
	}
	async function handleViewModeChange(mode: ViewMode) {
		viewMode = mode
		if (!browser) return
		const url = new URL($page.url)
		if (mode === 'two-column') url.searchParams.delete('view')
		else url.searchParams.set('view', mode)
		try {
			await goto(url.toString(), { replaceState: true, keepFocus: true })
			if (mode === 'horizontal') await loadAllPhotos()
		} catch (error) {
			console.error('Failed to change photo view:', error)
		}
	}
	let hasInitialized = false
	$effect(() => {
		if (hasInitialized) return
		hasInitialized = true
		if (!feed.hasMore) loaderState.complete()
		else if (viewMode === 'horizontal') loadAllPhotos()
	})

	// Generate metadata for photos page
	const metaTags = $derived(
		generateMetaTags({
			title: 'Photos',
			description: 'A collection of photography from travels, daily life, and creative projects.',
			url: pageUrl
		})
	)

	// Snapshot to preserve scroll position AND the photos loaded via infinite
	// scroll — without them the restored page is only one server page tall and
	// window.scrollTo clamps back to the top (most visible on mobile).
	export const snapshot: Snapshot<{
		scrollY: number
		horizontalScroll: number | undefined
		photos: Photo[]
		offset: number
	}> = {
		capture: () => {
			if (!browser) return { scrollY: 0, horizontalScroll: undefined, photos: [], offset: 0 }

			return {
				scrollY: window.scrollY,
				horizontalScroll: document.querySelector('.horizontal-scroll')?.scrollLeft,
				photos: allPhotos,
				offset: currentOffset
			}
		},
		restore: (snap) => {
			if (!browser) return

			// Re-hydrate everything loaded beyond the initial server page first,
			// so the document is tall enough for the scroll restore below
			if (snap.photos?.length > allPhotos.length) {
				collection.restore(snap.photos, snap.offset)
			}

			// Small delay to ensure content is rendered
			clearTimeout(restoreTimer)
			restoreTimer = setTimeout(() => {
				if (snap.scrollY) {
					window.scrollTo(0, snap.scrollY)
				}
				if (snap.horizontalScroll !== undefined) {
					const element = document.querySelector('.horizontal-scroll')
					if (element) {
						element.scrollLeft = snap.horizontalScroll
					}
				}
			}, 10)
		}
	}
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

<div
	class="photos-container"
	class:wide={containerWidth === 'wide'}
	class:horizontal-mode={viewMode === 'horizontal'}
>
	{#if error}
		<div class="error-container">
			<div class="error-message">
				<h2>Unable to load photos</h2>
				<p>{error}</p>
			</div>
		</div>
	{:else if allPhotos.length === 0}
		<div class="empty-container">
			<div class="empty-message">
				<h2>No photos yet</h2>
				<p>Photos and albums will be added soon</p>
			</div>
		</div>
	{:else}
		<ViewModeSelector
			mode={viewMode}
			width={containerWidth}
			onModeChange={handleViewModeChange}
			onWidthChange={(width) => (containerWidth = width)}
		/>

		<div class="grid-container" class:full-width={viewMode === 'horizontal'}>
			{#if viewMode === 'masonry'}
				<PhotoGrid photos={allPhotos} columns="auto" masonry={true} gap="medium" />
			{:else if viewMode === 'single'}
				<PhotoGrid photos={allPhotos} columns={1} gap="large" showCaptions={true} />
			{:else if viewMode === 'two-column'}
				<PhotoGrid photos={allPhotos} columns={2} gap="medium" />
			{:else if viewMode === 'horizontal'}
				<HorizontalPhotoScroll photos={allPhotos} />
				{#if isLoadingAll}
					<div class="loading-more-indicator">
						<LoadingSpinner size="small" text="Loading all photos..." />
					</div>
				{/if}
			{/if}
		</div>

		{#if viewMode !== 'horizontal' || lastError}
			<FeedLoader {loaderState} {loadMore} {lastError} noun="photos" />
		{/if}
	{/if}
</div>

<style lang="scss">
	.photos-container {
		width: 100%;
		max-width: 700px;
		margin: 0 auto;
		padding: 0 $unit-3x;
		transition: max-width 0.3s ease;

		&.wide {
			max-width: 1100px;
		}

		&.horizontal-mode {
			max-width: none;
			padding-left: 0;
			padding-right: 0;

			:global(.view-mode-selector) {
				max-width: 700px;
				margin-left: auto;
				margin-right: auto;
			}

			&.wide :global(.view-mode-selector) {
				max-width: 1100px;
			}
		}

		:global(.view-mode-selector) {
			margin-bottom: $unit-3x;
			position: sticky;
			top: $unit-2x;
			z-index: 10;
		}

		@include breakpoint('phone') {
			padding: 0 $unit-2x;
			box-sizing: border-box;
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

	.loading-more-indicator {
		position: fixed;
		bottom: $unit-3x;
		right: $unit-3x;
		background: $gray-100;
		padding: $unit-2x $unit-3x;
		border-radius: $corner-radius-lg;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		z-index: 20;
	}
</style>
