<script lang="ts">
	import LabCard from '$components/LabCard.svelte'
	import { generateMetaTags } from '$lib/utils/metadata'
	import { page } from '$app/stores'
	import type { PageData } from './$types'

	const { data }: { data: PageData } = $props()

	const projects = $derived(data.projects || [])
	const error = $derived(data.error)
	const pageUrl = $derived($page.url.href)

	// Generate metadata for labs page
	const metaTags = $derived(
		generateMetaTags({
			title: 'Labs',
			description:
				'Experimental projects and prototypes. A space for exploring new ideas, technologies, and creative coding.',
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

<div class="labs-container">
	{#if error}
		<div class="error-container">
			<div class="error-message">
				<h2>Unable to load projects</h2>
				<p>{error}</p>
			</div>
		</div>
	{:else if projects.length === 0}
		<div class="empty-container">
			<div class="empty-message">
				<h2>No projects yet</h2>
				<p>Projects will be added to Labs soon</p>
			</div>
		</div>
	{:else}
		<div class="projects-grid">
			{#each projects as project}
				<LabCard {project} />
			{/each}
		</div>
	{/if}
</div>

<style lang="scss">
	.labs-container {
		max-width: 700px;
		margin: 0 auto;
		padding: 0 $unit-2x;

		@include breakpoint('phone') {
			padding: 0 $unit-2x;
			box-sizing: border-box;
		}
	}

	.projects-grid {
		display: flex;
		flex-direction: column;
		gap: $unit-3x;

		@include breakpoint('phone') {
			gap: $unit-2x;
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
</style>
