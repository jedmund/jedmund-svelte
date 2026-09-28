<script lang="ts">
	import LabAvailability from './public/LabAvailability.svelte'
	import { createCardTilt } from '$lib/public/card-tilt.svelte'
	import type { Project } from '$lib/types/project'
	import Button from './admin/Button.svelte'

	const { project }: { project: Project } = $props()

	// Determine if the project is clickable (not list-only)
	const isClickable = $derived(project.status !== 'list-only')
	const projectUrl = $derived(`/labs/${project.slug}`)

	const tilt = createCardTilt(3, 1.02)
</script>

{#if isClickable}
	<div
		class="lab-card clickable"
		bind:this={tilt.element}
		onmousemove={tilt.move}
		onmouseenter={tilt.enter}
		onmouseleave={tilt.leave}
		onclick={() => (window.location.href = projectUrl)}
		onkeydown={(e) => e.key === 'Enter' && (window.location.href = projectUrl)}
		role="button"
		tabindex="0"
		style:transform={tilt.transform}
	>
		<div class="card-header">
			<div class="project-title-container">
				<h3 class="project-title">{project.title}</h3>
				<span class="project-year">{project.year}</span>
			</div>
			{#if project.externalUrl}
				<Button
					variant="primary"
					buttonSize="medium"
					href={project.externalUrl}
					target="_blank"
					rel="noopener noreferrer"
					iconPosition="right"
					onclick={(e) => e.stopPropagation()}
				>
					Visit
					{#snippet icon()}<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M5 12h14" />
							<path d="m12 5 7 7-7 7" />
						</svg>{/snippet}
				</Button>
			{/if}
		</div>

		<p class="project-description">{project.description}</p>

		<!-- Add status indicators for different project states -->
		<LabAvailability status={project.status} />
	</div>
{:else}
	<article
		class="lab-card"
		bind:this={tilt.element}
		onmousemove={tilt.move}
		onmouseenter={tilt.enter}
		onmouseleave={tilt.leave}
		style:transform={tilt.transform}
	>
		<div class="card-header">
			<div class="project-title-container">
				<h3 class="project-title">{project.title}</h3>
				<span class="project-year">{project.year}</span>
			</div>

			{#if project.externalUrl}
				<div class="project-links">
					<a
						href={project.externalUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="project-link primary"
					>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
							<path
								d="M10 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4M14 4h6m0 0v6m0-6L10 14"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
						Visit Project
					</a>
				</div>
			{/if}
		</div>

		<p class="project-description">{project.description}</p>

		<!-- Add status indicators for different project states -->
		<LabAvailability status={project.status} />
	</article>
{/if}

<style lang="scss">
	.lab-card {
		background: $gray-100;
		border-radius: $card-corner-radius;
		padding: $unit-3x;
		display: flex;
		flex-direction: column;
		gap: $unit-3x;
		transition:
			transform 0.15s ease-out,
			box-shadow 0.15s ease-out;
		text-decoration: none;
		color: inherit;
		transform-style: preserve-3d;
		will-change: transform;

		// Remove mask-image to allow shadows to render properly

		&:hover {
			box-shadow:
				0 10px 30px rgba(0, 0, 0, 0.1),
				0 1px 8px rgba(0, 0, 0, 0.06);

			.project-title {
				color: $red-60;
			}
		}

		&.clickable {
			cursor: pointer;

			&:focus {
				outline: 2px solid $red-60;
				outline-offset: 2px;
			}

			&:focus:not(:focus-visible) {
				outline: none;
			}
		}

		@include breakpoint('phone') {
			padding: $unit-2x;
		}

		p {
			margin-bottom: 0;
		}
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: $unit-2x;

		// Style the Button component when used in card header
		:global(.btn) {
			flex-shrink: 0;
			margin-top: 2px; // Align with title baseline
			font-size: 1rem !important; // Match detail page Visit button
			min-height: auto !important; // Remove min-height to match detail page
		}
	}

	.project-title-container {
		display: flex;
		flex-direction: column;
		gap: $unit-half;
	}

	.project-title {
		margin: 0;
		font-size: 1rem;
		font-weight: 400;
		color: $gray-00;
		line-height: 1.3;

		@include breakpoint('phone') {
			font-size: 1rem;
		}
	}

	.project-year {
		font-size: 0.875rem;
		color: $gray-40;
		font-weight: 400;
		white-space: nowrap;
	}

	.project-description {
		margin: 0 0 $unit-3x 0;
		font-size: 1rem;
		line-height: 1.5;
		color: $gray-20;

		@include breakpoint('phone') {
			font-size: 0.9rem;
		}
	}

	.project-links {
		display: flex;
		gap: $unit-2x;
		flex-wrap: wrap;
		margin-bottom: $unit-2x;
	}

	.project-link {
		display: flex;
		align-items: center;
		gap: $unit;
		padding: $unit $unit-2x;
		border-radius: $unit-2x;
		font-size: 0.875rem;
		font-weight: 500;
		text-decoration: none;
		transition: all 0.2s ease;
		border: 1px solid transparent;

		&.primary {
			background: $labs-color;
			color: white;

			&:hover {
				background: color.adjust($labs-color, $lightness: -10%);
				transform: translateY(-1px);
			}
		}

		svg {
			flex-shrink: 0;
		}
	}
</style>
