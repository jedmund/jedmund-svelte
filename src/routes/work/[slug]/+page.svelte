<script lang="ts">
	import Page from '$components/Page.svelte'
	import BackButton from '$components/BackButton.svelte'
	import ProjectPasswordProtection from '$lib/components/ProjectPasswordProtection.svelte'
	import ProjectHeaderContent from '$lib/components/ProjectHeaderContent.svelte'
	import ProjectContent from '$lib/components/ProjectContent.svelte'
	import type { PageData } from './$types'
	import type { Project } from '$lib/types/project'
	import { spring } from 'svelte/motion'

	let { data } = $props<{ data: PageData }>()

	const project = $derived(data.project as Project | null)
	const error = $derived(data.error as string | undefined)

	let headerContainer = $state<HTMLElement | null>(null)

	// Spring with aggressive bounce settings
	const logoPosition = spring(
		{ x: 0, y: 0 },
		{
			stiffness: 0.03, // Extremely low for maximum bounce
			damping: 0.1, // Very low for many oscillations
			precision: 0.001 // Keep animating for longer
		}
	)

	// Derive transform from spring position
	const logoTransform = $derived(`translate(${$logoPosition.x}px, ${$logoPosition.y}px)`)

	function handleMouseMove(e: MouseEvent) {
		if (!headerContainer) return

		const rect = headerContainer.getBoundingClientRect()
		const x = e.clientX - rect.left
		const y = e.clientY - rect.top

		const centerX = rect.width / 2
		const centerY = rect.height / 2

		// Calculate movement based on mouse position relative to center
		const moveX = ((x - centerX) / centerX) * 30 // 30px max movement for more dramatic effect
		const moveY = ((y - centerY) / centerY) * 30

		logoPosition.set({ x: moveX, y: moveY })
	}

	function handleMouseLeave() {
		logoPosition.set({ x: 0, y: 0 })
	}
</script>

{#if error}
	<div class="error-container">
		<Page>
			<div slot="header" class="error-header">
				<h1>Error</h1>
			</div>
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
		<div slot="header" class="error-header">
			<h1>Project Not Available</h1>
		</div>
		<div class="error-content">
			<p>This project is not yet available for viewing. Please check back later.</p>
			<BackButton href="/" label="Back to projects" />
		</div>
	</Page>
{:else if project.status === 'password-protected' || project.status === 'published'}
	{#snippet projectLayout()}
		<div class="project-wrapper">
			<div
				bind:this={headerContainer}
				class="project-header-container"
				style="background-color: {project.backgroundColor || '#f5f5f5'}"
				onmousemove={handleMouseMove}
				onmouseleave={handleMouseLeave}
				role="presentation"
				aria-hidden="true"
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
				{#snippet header()}
					<div class="project-header">
						<ProjectHeaderContent {project} />
					</div>
				{/snippet}
				{#if project.status === 'password-protected'}
					<ProjectPasswordProtection
						projectSlug={project.slug}
						correctPassword={project.password || ''}
						projectType="work"
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
			color: $grey-40;
			margin-bottom: $unit-2x;
		}
	}

	.loading {
		text-align: center;
		color: $grey-40;
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
		width: 100%;
	}
</style>
