<script lang="ts">
	import MasonryPhotoGrid from '$components/MasonryPhotoGrid.svelte'
	import LoadingSpinner from '$components/admin/LoadingSpinner.svelte'
	import { InfiniteLoader, LoaderState } from 'svelte-infinite'
	import { generateMetaTags } from '$lib/utils/metadata'
	import { page } from '$app/stores'
	import type { PageData } from './$types'
	import type { PhotoItem } from '$lib/types/photos'

	const { data }: { data: PageData } = $props()

	// Initialize loader state
	const loaderState = new LoaderState()

	// Initialize state with server-side data
	let allPhotoItems = $state<PhotoItem[]>(data.photoItems || [])
	let currentOffset = $state(data.pagination?.limit || 20)
	
	// Track loaded photo IDs to prevent duplicates
	let loadedPhotoIds = $state(new Set(data.photoItems?.map(item => item.id) || []))
	
	const error = $derived(data.error)
	const pageUrl = $derived($page.url.href)
	
	// Error message for retry display
	let lastError = $state<string>('')

	// Load more photos
	async function loadMore() {
		try {
			const response = await fetch(`/api/photos?limit=20&offset=${currentOffset}`)
			if (!response.ok) {
				throw new Error(`Failed to fetch photos: ${response.statusText}`)
			}
			
			const data = await response.json()
			
			// Filter out duplicates
			const newItems = (data.photoItems || []).filter(
				(item: PhotoItem) => !loadedPhotoIds.has(item.id)
			)
			
			// Add new photo IDs to the set
			newItems.forEach((item: PhotoItem) => loadedPhotoIds.add(item.id))
			
			// Append new photos to existing list
			allPhotoItems = [...allPhotoItems, ...newItems]
			
			// Update pagination state
			currentOffset += data.pagination?.limit || 20
			
			// Update loader state
			if (!data.pagination?.hasMore || newItems.length === 0) {
				loaderState.complete()
			} else {
				loaderState.loaded()
			}
			
			// Clear any previous error
			lastError = ''
		} catch (err) {
			console.error('Error loading more photos:', err)
			lastError = err instanceof Error ? err.message : 'Failed to load more photos'
			loaderState.error()
		}
	}

	// Initialize loader state based on initial data
	$effect(() => {
		if (!data.pagination?.hasMore) {
			loaderState.complete()
		}
	})

	// Generate metadata for photos page
	const metaTags = $derived(
		generateMetaTags({
			title: 'Photos',
			description: 'A collection of photography from travels, daily life, and creative projects.',
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

<div class="photos-container">
	{#if error}
		<div class="error-container">
			<div class="error-message">
				<h2>Unable to load photos</h2>
				<p>{error}</p>
			</div>
		</div>
	{:else if allPhotoItems.length === 0}
		<div class="empty-container">
			<div class="empty-message">
				<h2>No photos yet</h2>
				<p>Photos and albums will be added soon</p>
			</div>
		</div>
	{:else}
		<MasonryPhotoGrid photoItems={allPhotoItems} />
		
		<InfiniteLoader 
			{loaderState} 
			triggerLoad={loadMore}
			intersectionOptions={{ rootMargin: "0px 0px 200px 0px" }}
		>
			<!-- Empty content since we're rendering the grid above -->
			<div style="height: 1px;"></div>
			
			{#snippet loading()}
				<div class="loading-container">
					<LoadingSpinner size="medium" text="Loading more photos..." />
				</div>
			{/snippet}
			
			{#snippet error()}
				<div class="error-retry">
					<p class="error-text">{lastError || 'Failed to load photos'}</p>
					<button 
						class="retry-button" 
						onclick={() => {
							lastError = '';
							loaderState.reset();
							loadMore();
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
	.photos-container {
		width: 100%;
		max-width: 700px;
		margin: 0 auto;
		padding: 0 $unit-3x;

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
