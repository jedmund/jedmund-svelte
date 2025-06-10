<script lang="ts">
	import type { Project } from '$lib/types/project'
	import ArrowLeft from '$icons/arrow-left.svg'
	import { goto } from '$app/navigation'

	interface Props {
		project: Project
	}

	let { project }: Props = $props()

	// Function to render BlockNote content as HTML
	function renderBlockNoteContent(content: any): string {
		if (!content || !content.content) return ''

		return content.content
			.map((block: any) => {
				switch (block.type) {
					case 'heading':
						const level = block.attrs?.level || 1
						const text = block.content?.[0]?.text || ''
						return `<h${level}>${text}</h${level}>`

					case 'paragraph':
						if (!block.content || block.content.length === 0) return '<p><br></p>'
						const paragraphText = block.content.map((c: any) => c.text || '').join('')
						return `<p>${paragraphText}</p>`

					case 'image':
						return `<figure><img src="${block.attrs?.src}" alt="${block.attrs?.alt || ''}" style="width: ${block.attrs?.width || '100%'}; height: ${block.attrs?.height || 'auto'};" /></figure>`

					case 'bulletedList':
					case 'numberedList':
						const tag = block.type === 'bulletedList' ? 'ul' : 'ol'
						const items =
							block.content
								?.map((item: any) => {
									const itemText = item.content?.[0]?.content?.[0]?.text || ''
									return `<li>${itemText}</li>`
								})
								.join('') || ''
						return `<${tag}>${items}</${tag}>`

					default:
						return ''
				}
			})
			.join('')
	}
</script>

<article class="project-content">
	<!-- Case Study Content -->
	{#if project.caseStudyContent && project.caseStudyContent.content && project.caseStudyContent.content.length > 0}
		<div class="case-study-section">
			<div class="case-study-content">
				{@html renderBlockNoteContent(project.caseStudyContent)}
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
			<button onclick={() => goto('/labs')} class="back-button">
				<ArrowLeft class="back-arrow" />
				Back to labs
			</button>
		{:else}
			<button onclick={() => goto('/')} class="back-button">
				<ArrowLeft class="back-arrow" />
				Back to projects
			</button>
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
			color: $grey-10;
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
			font-size: 1.125rem;
		}

		:global(p) {
			margin: $unit-2x 0;
			font-size: 1.125rem;
			line-height: 1.5;
			color: $grey-20;
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
				color: $grey-20;
			}
		}
	}

	/* Gallery Section */
	.gallery-section {
		h2 {
			font-size: 1.75rem;
			margin: 0 0 $unit-3x;
			color: $grey-10;
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

	.back-button {
		color: $red-60;
		background-color: transparent;
		border: 1px solid transparent;
		font: inherit;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
		display: inline-flex;
		align-items: center;
		gap: $unit;
		border-radius: 24px;
		outline: none;

		&:hover:not(:disabled) :global(.back-arrow) {
			transform: translateX(-3px);
		}

		&:focus-visible {
			box-shadow: 0 0 0 3px rgba($red-60, 0.25);
		}

		:global(.back-arrow) {
			width: 16px;
			height: 16px;
			flex-shrink: 0;
			transition: transform 0.2s ease;
			margin-left: -$unit-half;

			:global(path) {
				stroke: currentColor;
				stroke-width: 2.25;
				stroke-linecap: round;
				stroke-linejoin: round;
				fill: none;
			}
		}
	}
</style>
