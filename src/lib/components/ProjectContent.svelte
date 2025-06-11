<script lang="ts">
	import type { Project } from '$lib/types/project'
	import BackButton from './BackButton.svelte'
	import { renderEdraContent } from '$lib/utils/content'

	interface Props {
		project: Project
	}

	let { project }: Props = $props()
</script>

<article class="project-content">
	<!-- Case Study Content -->
	{#if project.caseStudyContent && project.caseStudyContent.content && project.caseStudyContent.content.length > 0}
		<div class="case-study-section">
			<div class="case-study-content">
				{@html renderEdraContent(project.caseStudyContent)}
			</div>
		</div>
	{/if}

	<!-- Gallery (if available) -->
	{#if project.gallery && project.gallery.length > 0}
		<div class="gallery-section">
			<h2>Gallery</h2>
			<div class="gallery-grid">
				{#each project.gallery as image}
					<img src={image} alt="Project gallery image" />
				{/each}
			</div>
		</div>
	{/if}

	<!-- Navigation -->
	<footer class="project-footer">
		{#if project.projectType === 'labs'}
			<BackButton href="/labs" label="Back to Labs" />
		{:else}
			<BackButton href="/" label="Back to projects" />
		{/if}
	</footer>
</article>

<style lang="scss">
	/* Project Content */
	.project-content {
		display: flex;
		flex-direction: column;
		gap: $unit-4x;
	}

	/* Case Study Section */
	.case-study-content {
		:global(h1),
		:global(h2),
		:global(h3) {
			margin: $unit-3x 0 $unit-2x;
			color: $text-color;
			font-weight: 600;

			&:first-child {
				margin-top: 0;
			}
		}

		:global(h1) {
			font-size: 1.75rem;
		}

		:global(h2) {
			font-size: 1.375rem;
		}

		:global(h3) {
			font-size: 1rem;
		}

		:global(p) {
			margin: $unit-2x 0;
			font-size: 1rem;
			line-height: 1.5;
			color: $text-color;
		}

		:global(figure) {
			margin: $unit-3x 0;

			:global(img) {
				width: 100%;
				height: auto;
				border-radius: $unit;
			}
		}

		:global(ul),
		:global(ol) {
			margin: $unit-2x 0;
			padding-left: $unit-3x;

			:global(li) {
				margin: $unit 0;
				font-size: 1.0625rem;
				line-height: 1.65;
				color: $text-color;

				:global(p) {
					margin: 0;
				}
			}
		}

		:global(a) {
			color: $red-60;
			text-decoration: none;
			transition: all 0.2s ease;

			&:hover {
				text-decoration: underline;
			}
		}
	}

	/* Gallery Section */
	.gallery-section {
		h2 {
			font-size: 1.75rem;
			margin: 0 0 $unit-3x;
			color: $text-color;
			font-weight: 600;
		}
	}

	.gallery-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: $unit-2x;

		img {
			width: 100%;
			height: auto;
			border-radius: $unit;
		}
	}

	/* Navigation */
	.project-footer {
		padding-bottom: $unit-2x;
	}
</style>
