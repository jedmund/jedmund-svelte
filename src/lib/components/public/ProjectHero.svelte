<script lang="ts">
	import { spring } from 'svelte/motion'
	import type { Project } from '$lib/types/project'
	let { project }: { project: Project } = $props()
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

<div
	bind:this={headerContainer}
	class="project-header-container"
	class:has-image={project.showFeaturedImageInHeader && project.featuredImage}
	style:background-color={!project.showFeaturedImageInHeader || !project.featuredImage
		? project.showBackgroundColorInHeader && project.backgroundColor
			? project.backgroundColor
			: '#f5f5f5'
		: undefined}
	style:background-image={project.showFeaturedImageInHeader && project.featuredImage
		? `url(${project.featuredImage})`
		: undefined}
	onmousemove={handleMouseMove}
	onmouseleave={handleMouseLeave}
	role="presentation"
	aria-hidden="true"
>
	{#if project.showLogoInHeader && project.logoUrl}
		<img
			src={project.logoUrl}
			alt="{project.title} logo"
			class="project-logo"
			style="transform: {logoTransform}"
		/>
	{/if}
</div>

<style lang="scss">
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

		&.has-image {
			background-size: cover;
			background-position: center;
			background-repeat: no-repeat;
		}

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
</style>
