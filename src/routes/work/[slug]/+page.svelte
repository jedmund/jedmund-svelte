<script lang="ts">
	import Page from '$components/Page.svelte'
	import ProjectPasswordProtection from '$lib/components/ProjectPasswordProtection.svelte'
	import ProjectContent from '$lib/components/ProjectContent.svelte'
	import type { PageData } from './$types'
	import type { Project } from '$lib/types/project'

	let { data } = $props<{ data: PageData }>()

	const project = $derived(data.project as Project | null)
	const error = $derived(data.error as string | undefined)

	let headerContainer = $state<HTMLElement | null>(null)
	let logoTransform = $state('translate(0, 0)')

	function handleMouseMove(e: MouseEvent) {
		if (!headerContainer) return

		const rect = headerContainer.getBoundingClientRect()
		const x = e.clientX - rect.left
		const y = e.clientY - rect.top

		const centerX = rect.width / 2
		const centerY = rect.height / 2

		// Calculate movement based on mouse position relative to center
		const moveX = ((x - centerX) / centerX) * 15 // 15px max movement
		const moveY = ((y - centerY) / centerY) * 15

		logoTransform = `translate(${moveX}px, ${moveY}px)`
	}

	function handleMouseLeave() {
		logoTransform = 'translate(0, 0)'
	}
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
	<div class="project-wrapper">
		<div
			bind:this={headerContainer}
			class="project-header-container"
			style="background-color: {project.backgroundColor || '#f5f5f5'}"
			onmousemove={handleMouseMove}
			onmouseleave={handleMouseLeave}
		>
			{#if project.logoUrl}
				<img 
					src={project.logoUrl} 
					alt="{project.title} logo" 
					class="project-logo" 
					style="transform: {logoTransform}"
				/>
			{/if}
		</div>
		<Page>
			<ProjectPasswordProtection
				projectSlug={project.slug}
				correctPassword={project.password || ''}
				projectType="work"
			>
				{#snippet children()}
					<div slot="header" class="project-header">
						<h1 class="project-title">{project.title}</h1>
						{#if project.subtitle}
							<p class="project-subtitle">{project.subtitle}</p>
						{/if}
					</div>
					<ProjectContent {project} />
				{/snippet}
			</ProjectPasswordProtection>
		</Page>
	</div>
{:else}
	<div class="project-wrapper">
		<div
			bind:this={headerContainer}
			class="project-header-container"
			style="background-color: {project.backgroundColor || '#f5f5f5'}"
			onmousemove={handleMouseMove}
			onmouseleave={handleMouseLeave}
		>
			{#if project.logoUrl}
				<img 
					src={project.logoUrl} 
					alt="{project.title} logo" 
					class="project-logo" 
					style="transform: {logoTransform}"
				/>
			{/if}
		</div>
		<Page>
			<div slot="header" class="project-header">
				<h1 class="project-title">{project.title}</h1>
				{#if project.subtitle}
					<p class="project-subtitle">{project.subtitle}</p>
				{/if}
			</div>
			<ProjectContent {project} />
		</Page>
	</div>
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

	/* Project Wrapper */
	.project-wrapper {
		width: 100%;
		max-width: 700px;
		margin: 0 auto;

		@include breakpoint('phone') {
			margin-top: $unit-3x;
		}

		:global(.page) {
			margin-top: 0;
			border-top-left-radius: 0;
			border-top-right-radius: 0;
		}
	}

	/* Project Header Container */
	.project-header-container {
		width: 100%;
		height: 300px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-top-left-radius: $card-corner-radius;
		border-top-right-radius: $card-corner-radius;
		position: relative;
		overflow: hidden;

		@include breakpoint('phone') {
			height: 250px;
		}

		@include breakpoint('small-phone') {
			height: 200px;
		}
	}

	/* Project Logo */
	.project-logo {
		width: 85px;
		height: 85px;
		object-fit: contain;
		transition: transform 0.15s cubic-bezier(0.075, 0.82, 0.165, 1);
		will-change: transform;

		@include breakpoint('phone') {
			width: 75px;
			height: 75px;
		}

		@include breakpoint('small-phone') {
			width: 65px;
			height: 65px;
		}
	}

	/* Project Header */
	.project-header {
		text-align: center;
		width: 100%;
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
