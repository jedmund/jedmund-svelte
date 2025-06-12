<script lang="ts">
	import UniverseFeed from '$components/UniverseFeed.svelte'
	import { generateMetaTags } from '$lib/utils/metadata'
	import { page } from '$app/stores'
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()

	const pageUrl = $derived($page.url.href)

	// Generate metadata for universe page
	const metaTags = $derived(
		generateMetaTags({
			title: 'Universe',
			description:
				'A mixed feed of posts, thoughts, and photo albums. Essays, experiments, and everything in between.',
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

<div class="universe-container">
	{#if data.error}
		<div class="error-message">
			<p>{data.error}</p>
		</div>
	{:else}
		<UniverseFeed items={data.universeItems || []} />
	{/if}
</div>

<style lang="scss">
	.universe-container {
		max-width: 784px;
		margin: 0 auto;
		padding: 0;
	}

	.error-message {
		text-align: center;
		padding: $unit-6x $unit-3x;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.2);
		border-radius: $unit-2x;
		color: #dc2626;

		p {
			margin: 0;
			font-size: 1rem;
		}
	}
</style>
