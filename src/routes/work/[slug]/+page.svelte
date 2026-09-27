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
	import ProjectHero from '$lib/components/public/ProjectHero.svelte'
	import { onDestroy } from 'svelte'
	import { responseData } from '$lib/admin/response'

	let { data } = $props<{ data: PageData }>()

	let refetchedProject = $state<Project | null>(null)
	const project = $derived(refetchedProject ?? (data.project as Project | null))
	const error = $derived(data.error as string | undefined)
	const pageUrl = $derived($page.url.href)

	// Generate metadata
	const metaTags = $derived(
		project
			? generateMetaTags({
					title: project.title,
					description:
						project.description || `${project.title} — A professional project by Justin Edmund`,
					url: pageUrl,
					image: project.featuredImage || project.logoUrl || undefined,
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
					description: project.description ?? undefined,
					url: pageUrl,
					image: project.featuredImage || project.logoUrl || undefined,
					creator: 'Justin Edmund',
					dateCreated: project.year ? `${project.year}-01-01` : undefined,
					keywords: []
				})
			: null
	)

	const projectJsonLdScript = $derived(
		projectJsonLd
			? `<script type="application/ld+json">${JSON.stringify(projectJsonLd)}\u003c/script>`
			: null
	)

	let unlockAbort: AbortController | undefined
	onDestroy(() => unlockAbort?.abort())
	async function handleProjectUnlocked() {
		if (!project) return
		unlockAbort?.abort()
		const request = new AbortController()
		unlockAbort = request
		const id = project.id
		try {
			const result = await responseData<Project>(
				await fetch(`/api/projects/${id}`, { credentials: 'same-origin', signal: request.signal })
			)
			if (!request.signal.aborted && project.id === id) refetchedProject = result
		} catch (error) {
			if (!request.signal.aborted) console.error('Failed to load unlocked project:', error)
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

	<!-- Other meta tags -->
	{#if metaTags.other.canonical}
		<link rel="canonical" href={metaTags.other.canonical} />
	{/if}
	{#if metaTags.other.robots}
		<meta name="robots" content={metaTags.other.robots} />
	{/if}

	<!-- JSON-LD -->
	{#if projectJsonLdScript}
		{@html projectJsonLdScript}
	{/if}
</svelte:head>

{#if error}
	<div class="error-container">
		<Page>
			{#snippet header()}
				<div class="error-header">
					<h1>Error</h1>
				</div>
			{/snippet}
			<div class="error-content">
				<p>{error}</p>
				<BackButton href="/" label="Back to projects" />
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
			<BackButton href="/" label="Back to projects" />
		</div>
	</Page>
{:else if project.status === 'password-protected' || project.status === 'published'}
	{#snippet projectLayout()}
		<div class="project-wrapper">
			<ProjectHero {project} />
			<Page>
				{#snippet header()}
					<div class="project-header">
						<ProjectHeaderContent {project} />
					</div>
				{/snippet}
				{#if project.locked}
					<ProjectPasswordProtection
						projectId={project.id}
						projectSlug={project.slug}
						projectType="work"
						onUnlocked={handleProjectUnlocked}
					/>
				{:else}
					<ProjectContent {project} />
				{/if}
			</Page>
		</div>
	{/snippet}

	{@render projectLayout()}
{/if}

<style lang="scss">
	/* Error and Loading States */
	.error-container {
		width: 100%;
		max-width: 700px;
		margin: 0 auto;
		box-sizing: border-box;
		padding: 0 $unit-2x;
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

		:global(.page) {
			margin-top: 0;
			border-top-left-radius: 0;
			border-top-right-radius: 0;
		}
	}

	/* Project Header */
	.project-header {
		width: 100%;
	}
</style>
