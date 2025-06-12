<script lang="ts">
	import ProjectList from '$components/ProjectList.svelte'
	import { generateMetaTags } from '$lib/utils/metadata'
	import { page } from '$app/stores'
	import type { PageData } from './$types'

	let { data } = $props<{ data: PageData }>()

	const pageUrl = $derived($page.url.href)

	// Generate metadata for homepage
	const metaTags = $derived(
		generateMetaTags({
			title: undefined, // Use default title for homepage
			description:
				'Software designer crafting thoughtful digital experiences. Currently building products at scale.',
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

<ProjectList projects={data?.projects || []} />
