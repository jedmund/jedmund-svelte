<script lang="ts">
	import Page from '$components/Page.svelte'
	import ProjectPasswordProtection from '$lib/components/ProjectPasswordProtection.svelte'
	import ProjectContent from '$lib/components/ProjectContent.svelte'
	import type { PageData } from './$types'
	import type { Project } from '$lib/types/project'

	let { data } = $props<{ data: PageData }>()

	const project = $derived(data.project as Project | null)
	const error = $derived(data.error as string | undefined)
</script>

{#if error}
	<Page>
		<div slot="header" class="error-header">
			<h1>Error</h1>
		</div>
		<div class="error-content">
			<p>{error}</p>
			<a href="/" class="back-link">← Back to home</a>
		</div>
	</Page>
{:else if !project}
	<Page>
		<div class="loading">Loading project...</div>
	</Page>
{:else if project.status === 'list-only'}
	<Page>
		<div slot="header" class="error-header">
			<h1>Project Not Available</h1>
		</div>
		<div class="error-content">
			<p>This project is not yet available for viewing. Please check back later.</p>
			<a href="/" class="back-link">← Back to projects</a>
		</div>
	</Page>
{:else if project.status === 'password-protected'}
	<Page>
		<ProjectPasswordProtection
			projectSlug={project.slug}
			correctPassword={project.password || ''}
			projectType="work"
		>
			{#snippet children()}
				<div slot="header" class="project-header">
					{#if project.logoUrl}
						<div
							class="project-logo"
							style="background-color: {project.backgroundColor || '#f5f5f5'}"
						>
							<img src={project.logoUrl} alt="{project.title} logo" />
						</div>
					{/if}
					<h1 class="project-title">{project.title}</h1>
					{#if project.subtitle}
						<p class="project-subtitle">{project.subtitle}</p>
					{/if}
				</div>
				<ProjectContent {project} />
			{/snippet}
		</ProjectPasswordProtection>
	</Page>
{:else}
	<Page>
		<div slot="header" class="project-header">
			{#if project.logoUrl}
				<div class="project-logo" style="background-color: {project.backgroundColor || '#f5f5f5'}">
					<img src={project.logoUrl} alt="{project.title} logo" />
				</div>
			{/if}
			<h1 class="project-title">{project.title}</h1>
			{#if project.subtitle}
				<p class="project-subtitle">{project.subtitle}</p>
			{/if}
		</div>
		<ProjectContent {project} />
	</Page>
{/if}

<style lang="scss">
	/* Error and Loading States */
	.error-header h1 {
		color: $red-60;
		font-size: 2rem;
		margin: 0;
	}

	.error-content {
		text-align: center;

		p {
			color: $grey-40;
			margin-bottom: $unit-2x;
		}
	}

	.loading {
		text-align: center;
		color: $grey-40;
		padding: $unit-4x;
	}

	.back-link {
		color: $grey-40;
		text-decoration: none;
		font-size: 0.925rem;
		transition: color 0.2s ease;

		&:hover {
			color: $grey-20;
		}
	}

	/* Project Header */
	.project-header {
		text-align: center;
		width: 100%;
	}

	.project-logo {
		width: 100px;
		height: 100px;
		margin: 0 auto $unit-2x;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: $unit-2x;
		padding: $unit-2x;
		box-sizing: border-box;

		img {
			max-width: 100%;
			max-height: 100%;
			object-fit: contain;
		}
	}

	.project-title {
		font-size: 2.5rem;
		font-weight: 700;
		margin: 0 0 $unit;
		color: $grey-10;

		@include breakpoint('phone') {
			font-size: 2rem;
		}
	}

	.project-subtitle {
		font-size: 1.25rem;
		color: $grey-40;
		margin: 0;

		@include breakpoint('phone') {
			font-size: 1.125rem;
		}
	}
</style>
