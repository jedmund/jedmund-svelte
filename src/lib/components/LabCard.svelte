<script lang="ts">
	import type { LabProject } from '$lib/types/labs'

	const { project }: { project: LabProject } = $props()
</script>

<article class="lab-card">
	<div class="card-header">
		<h3 class="project-title">{project.title}</h3>
		<span class="project-year">{project.year}</span>
	</div>

	<p class="project-description">{project.description}</p>

	{#if project.url || project.github}
		<div class="project-links">
			{#if project.url}
				<a href={project.url} target="_blank" rel="noopener noreferrer" class="project-link primary">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
						<path d="M10 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4M14 4h6m0 0v6m0-6L10 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
					Visit Project
				</a>
			{/if}
			{#if project.github}
				<a href={project.github} target="_blank" rel="noopener noreferrer" class="project-link secondary">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
						<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
					GitHub
				</a>
			{/if}
		</div>
	{/if}
</article>

<style lang="scss">
	.lab-card {
		background: $grey-100;
		border-radius: $card-corner-radius;
		padding: $unit-3x;
		transition: transform 0.2s ease, box-shadow 0.2s ease;

		&:hover {
			transform: translateY(-2px);
			box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
		}

		@include breakpoint('phone') {
			padding: $unit-2x;
		}
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: $unit-2x;
		gap: $unit-2x;
	}

	.project-title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: $grey-00;
		line-height: 1.3;
		
		@include breakpoint('phone') {
			font-size: 1.125rem;
		}
	}

	.project-year {
		font-size: 0.875rem;
		color: $grey-40;
		font-weight: 500;
		white-space: nowrap;
	}

	.project-description {
		margin: 0 0 $unit-3x 0;
		font-size: 1rem;
		line-height: 1.5;
		color: $grey-20;

		@include breakpoint('phone') {
			font-size: 0.9rem;
		}
	}

	.project-links {
		display: flex;
		gap: $unit-2x;
		flex-wrap: wrap;
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
				background: darken($labs-color, 10%);
				transform: translateY(-1px);
			}
		}

		&.secondary {
			background: transparent;
			color: $grey-20;
			border-color: rgba(0, 0, 0, 0.1);

			&:hover {
				background: rgba(0, 0, 0, 0.05);
				color: $grey-00;
			}
		}

		svg {
			flex-shrink: 0;
		}
	}
</style>