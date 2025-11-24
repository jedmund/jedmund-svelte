<script lang="ts">
	import Page from '$components/Page.svelte'
	import BackButton from '$components/BackButton.svelte'
	import ProjectPasswordProtection from '$lib/components/ProjectPasswordProtection.svelte'
	import ProjectHeaderContent from '$lib/components/ProjectHeaderContent.svelte'
	import ProjectContent from '$lib/components/ProjectContent.svelte'
	import { generateMetaTags, generateCreativeWorkJsonLd } from '$lib/utils/metadata'
	import { page } from '$app/stores'
	import type { PageData } from './$types'
	import type { Project } from '$lib/types/project'

	let { data } = $props<{ data: PageData }>()

	const project = $derived(data.project as Project | null)
	const error = $derived(data.error as string | undefined)
	const pageUrl = $derived($page.url.href)

	// Generate metadata
	const metaTags = $derived(
		project
			? generateMetaTags({
					title: project.title,
					description: project.description || `${project.title} — An experimental project`,
					url: pageUrl,
					image: project.thumbnailUrl,
					type: 'article',
					titleFormat: { type: 'by' }
				})
			: generateMetaTags({
					title: 'Project Not Found',
					description: 'The project you are looking for could not be found.',
					url: pageUrl,
					noindex: true
				})
	)

	// Generate creative work JSON-LD
	const projectJsonLd = $derived(
		project
			? generateCreativeWorkJsonLd({
					name: project.title,
					description: project.description,
					url: pageUrl,
					image: project.thumbnailUrl,
					creator: 'Justin Edmund',
					dateCreated: project.year ? `${project.year}-01-01` : undefined,
					keywords: project.tags || []
				})
			: null
	)

	const projectJsonLdScript = $derived(
		// eslint-disable-next-line no-useless-escape -- Escape required for Svelte parser
		projectJsonLd ? `<script type="application/ld+json">${JSON.stringify(projectJsonLd)}<\/script>` : null
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

	<!-- Other meta tags -->
	{#if metaTags.other.canonical}
		<link rel="canonical" href={metaTags.other.canonical} />
	{/if}
	{#if metaTags.other.robots}
		<meta name="robots" content={metaTags.other.robots} />
	{/if}

	<!-- JSON-LD -->
	{#if projectJsonLdScript}
		<!-- svelte-ignore svelte/no-at-html-tags -->
		{@html projectJsonLdScript}
	{/if}
</svelte:head>

{#if error}
	<div class="error-wrapper">
		<Page>
			<div class="error-content">
				<p>{error}</p>
				<BackButton href="/labs" label="Back to Labs" />
			</div>
		</Page>
	</div>
{:else if !project}
	<Page>
		<div class="loading">Loading project...</div>
	</Page>
{:else if project.status === 'list-only'}
	<Page>
		{#snippet header()}
			<div class="error-header">
				<h1>Project Not Available</h1>
			</div>
		{/snippet}
		<div class="error-content">
			<p>This project is not yet available for viewing. Please check back later.</p>
			<BackButton href="/labs" label="Back to Labs" />
		</div>
	</Page>
{:else if project.status === 'password-protected' || project.status === 'published'}
	<div class="project-wrapper">
		<Page>
			{#snippet header()}
				<div class="project-header">
					<ProjectHeaderContent {project} />
				</div>
			{/snippet}
			{#if project.status === 'password-protected'}
				<ProjectPasswordProtection
					projectSlug={project.slug}
					correctPassword={project.password || ''}
					projectType="labs"
				>
					{#snippet children()}
						<ProjectContent {project} />
					{/snippet}
				</ProjectPasswordProtection>
			{:else}
				<ProjectContent {project} />
			{/if}
		</Page>
	</div>
{/if}

<style lang="scss">
	/* Error and Loading States */
	.error-wrapper {
		width: 100%;
		max-width: 700px;
		margin: 0 auto;
		padding: 0 $unit-2x;
		box-sizing: border-box;
	}

	.error-header h1 {
		color: $red-60;
		font-size: 2rem;
		margin: 0;
	}

	.error-content {
		text-align: center;

		p {
			color: $gray-40;
			margin-bottom: $unit-2x;
		}
	}

	.loading {
		text-align: center;
		color: $gray-40;
		padding: $unit-4x;
	}

	/* Project Wrapper */
	.project-wrapper {
		width: 100%;
		max-width: 700px;
		margin: 0 auto;
		box-sizing: border-box;

		@include breakpoint('phone') {
			padding: 0 $unit-2x;
		}
	}

	/* Project Header */
	.project-header {
		width: 100%;
	}
</style>
