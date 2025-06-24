<script lang="ts">
	import SmartImage from '$components/SmartImage.svelte'
	import LoadingSpinner from '$components/admin/LoadingSpinner.svelte'
	import { InfiniteLoader, LoaderState } from 'svelte-infinite'
	import { generateMetaTags } from '$lib/utils/metadata'
	import { page } from '$app/stores'
	import { browser } from '$app/environment'
	import type { PageData } from './$types'

	interface Album {
		id: string
		slug: string
		title: string
		description?: string
		date?: string
		location?: string
		photoCount: number
		coverPhoto?: {
			id: string
			url: string
			thumbnailUrl?: string
			width?: number
			height?: number
			dominantColor?: string
			colors?: any
			aspectRatio?: number
			caption?: string
		}
		hasContent: boolean
	}

	const { data }: { data: PageData } = $props()

	// Initialize loader state
	const loaderState = new LoaderState()

	// Initialize state with server-side data
	let allAlbums = $state<Album[]>(data.albums || [])
	let currentOffset = $state(data.pagination?.limit || 20)

	const error = $derived(data.error)
	const pageUrl = $derived($page.url.href)

	// Error message for retry display
	let lastError = $state<string>('')

	// Load more albums
	async function loadMore() {
		try {
			const response = await fetch(`/api/albums?limit=20&offset=${currentOffset}`)
			if (!response.ok) {
				throw new Error(`Failed to fetch albums: ${response.statusText}`)
			}

			const data = await response.json()

			// Append new albums to existing list
			allAlbums = [...allAlbums, ...(data.albums || [])]

			// Update pagination state
			currentOffset += data.pagination?.limit || 20

			// Update loader state
			if (!data.pagination?.hasMore) {
				loaderState.complete()
			} else {
				loaderState.loaded()
			}

			// Clear any previous error
			lastError = ''
		} catch (err) {
			console.error('Error loading more albums:', err)
			lastError = err instanceof Error ? err.message : 'Failed to load more albums'
			loaderState.error()
		}
	}

	// Initialize loader state based on initial data
	let hasInitialized = false
	$effect(() => {
		if (!hasInitialized) {
			hasInitialized = true
			if (!data.pagination?.hasMore) {
				loaderState.complete()
			}
		}
	})

	// Format date
	const formatDate = (dateString?: string) => {
		if (!dateString) return null
		const date = new Date(dateString)
		return date.toLocaleDateString('en-US', {
			month: 'long',
			year: 'numeric'
		})
	}

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
				<a href="/photos/{album.slug}" class="album-card">
					{#if album.coverPhoto}
						<div class="album-cover">
							<SmartImage
								media={{
									url: album.coverPhoto.url,
									thumbnailUrl: album.coverPhoto.thumbnailUrl,
									width: album.coverPhoto.width,
									height: album.coverPhoto.height,
									dominantColor: album.coverPhoto.dominantColor,
									colors: album.coverPhoto.colors,
									aspectRatio: album.coverPhoto.aspectRatio
								}}
								alt={album.title}
								loading="lazy"
							/>
						</div>
					{:else}
						<div class="album-cover empty">
							<div class="empty-icon">📷</div>
						</div>
					{/if}

					<div class="album-info">
						<h2 class="album-title">{album.title}</h2>

						{#if album.description}
							<p class="album-description">{album.description}</p>
						{/if}

						<div class="album-meta">
							{#if album.date}
								<span class="meta-item">{formatDate(album.date)}</span>
							{/if}
							{#if album.location}
								<span class="meta-item">📍 {album.location}</span>
							{/if}
							<span class="meta-item">{album.photoCount} photos</span>
							{#if album.hasContent}
								<span class="meta-item story-indicator">📖 Story</span>
							{/if}
						</div>
					</div>
				</a>
			{/each}
		</div>

		<InfiniteLoader
			{loaderState}
			triggerLoad={loadMore}
			intersectionOptions={{ rootMargin: '0px 0px 200px 0px' }}
		>
			<!-- Empty content since we're rendering the grid above -->
			<div style="height: 1px;"></div>

			{#snippet loading()}
				<div class="loading-container">
					<LoadingSpinner size="medium" text="Loading more albums..." />
				</div>
			{/snippet}

			{#snippet error()}
				<div class="error-retry">
					<p class="error-text">{lastError || 'Failed to load albums'}</p>
					<button
						class="retry-button"
						onclick={() => {
							lastError = ''
							loaderState.reset()
							loadMore()
						}}
					>
						Try again
					</button>
				</div>
			{/snippet}

			{#snippet noData()}
				<div class="end-message">
					<p>You've reached the end</p>
				</div>
			{/snippet}
		</InfiniteLoader>
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
			color: $grey-10;

			@include breakpoint('phone') {
				font-size: 2rem;
			}
		}

		.page-description {
			font-size: 1.125rem;
			color: $grey-40;
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

	.album-card {
		display: block;
		text-decoration: none;
		color: inherit;
		background: $grey-100;
		border-radius: $card-corner-radius;
		overflow: hidden;
		transition: all 0.3s ease;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

		&:hover {
			transform: translateY(-2px);
			box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);

			.album-cover {
				:global(img) {
					transform: scale(1.05);
				}
			}
		}
	}

	.album-cover {
		position: relative;
		aspect-ratio: 4 / 3;
		overflow: hidden;
		background: $grey-95;

		:global(img) {
			width: 100%;
			height: 100%;
			object-fit: cover;
			transition: transform 0.3s ease;
		}

		&.empty {
			display: flex;
			align-items: center;
			justify-content: center;
			background: $grey-95;

			.empty-icon {
				font-size: 3rem;
				opacity: 0.3;
			}
		}
	}

	.album-info {
		padding: $unit-3x;

		@include breakpoint('phone') {
			padding: $unit-2x;
		}
	}

	.album-title {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0 0 $unit;
		color: $grey-10;

		@include breakpoint('phone') {
			font-size: 1.125rem;
		}
	}

	.album-description {
		font-size: 0.875rem;
		color: $grey-40;
		margin: 0 0 $unit-2x;
		line-height: 1.5;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.album-meta {
		display: flex;
		flex-wrap: wrap;
		gap: $unit-2x;
		font-size: 0.8125rem;
		color: $grey-50;

		.meta-item {
			display: flex;
			align-items: center;
			gap: $unit-half;

			&.story-indicator {
				color: $blue-50;
				font-weight: 500;
			}
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
			color: $grey-10;
		}

		p {
			margin: 0;
			color: $grey-40;
			line-height: 1.5;
		}
	}

	.error-message {
		h2 {
			color: $red-60;
		}
	}

	.loading-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 100px;
		margin-top: $unit-4x;
	}

	.end-message {
		text-align: center;
		padding: $unit-6x 0;

		p {
			margin: 0;
			color: $grey-50;
			font-size: 1rem;
		}
	}

	.error-retry {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: $unit-2x;
		padding: $unit-4x $unit-2x;
		margin-top: $unit-4x;
	}

	.error-text {
		margin: 0;
		color: $red-60;
		font-size: 0.875rem;
		text-align: center;
		max-width: 300px;
	}

	.retry-button {
		padding: $unit $unit-3x;
		background-color: $primary-color;
		color: white;
		border: none;
		border-radius: $unit;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s ease;

		&:hover {
			background-color: darken($primary-color, 10%);
		}

		&:active {
			transform: scale(0.98);
		}
	}
</style>
