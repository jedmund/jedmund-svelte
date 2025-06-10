<script lang="ts">
	import ArrowRight from '$icons/arrow-right.svg'
	import type { Project } from '$lib/types/project'

	interface Props {
		project: Project
	}

	let { project }: Props = $props()
</script>

<div class="project-header-content">
	<div class="project-text">
		<h1 class="project-title">{project.title}</h1>
	</div>
	{#if project.externalUrl}
		<a
			href={project.externalUrl}
			target="_blank"
			rel="noopener noreferrer"
			class="visit-button"
			style="--button-bg: {project.highlightColor || '#4d4d4d'}; --button-color: white"
		>
			Visit <ArrowRight />
		</a>
	{/if}
</div>

<style lang="scss">
	/* Project Header */
	.project-header {
		width: 100%;
	}

	.project-header-content {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: $unit-3x;

		@include breakpoint('phone') {
			flex-direction: column;
			gap: $unit-2x;
		}
	}

	.project-text {
		flex: 1;
	}

	.project-title {
		font-size: 2.25rem;
		letter-spacing: -0.025em;
		font-weight: 500;
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

	.visit-button {
		display: inline-flex;
		align-items: center;
		gap: $unit;
		padding: ($unit * 1.5) $unit-2x;
		background: var(--button-bg, $grey-10);
		color: var(--button-color, white);
		text-decoration: none;
		border-radius: 50px;
		font-weight: 400;
		font-size: 1rem;
		transition: all 0.2s ease;
		white-space: nowrap;

		:global(svg) {
			width: 16px;
			height: 16px;
			transition: transform 0.2s ease;

			:global(path) {
				stroke: currentColor;
				stroke-width: 2;
				stroke-linecap: round;
				stroke-linejoin: round;
				fill: none;
			}
		}

		&:hover {
			background: color-mix(in srgb, var(--button-bg) 90%, black);

			:global(svg) {
				transform: translateX(2px);
			}
		}

		@include breakpoint('phone') {
			align-self: flex-start;
		}
	}
</style>