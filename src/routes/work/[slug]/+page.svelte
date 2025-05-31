<script lang="ts">
	import Page from '$components/Page.svelte'
	import type { PageData } from './$types'
	import type { Project } from '$lib/types/project'

	let { data } = $props<{ data: PageData }>()

	const project = $derived(data.project as Project | null)
	const error = $derived(data.error as string | undefined)

	// Temporary function to render BlockNote content as HTML
	// This is a basic implementation - you might want to use a proper BlockNote renderer
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

		<article class="project-content">
			<!-- Project Details -->
			<div class="project-details">
				<div class="meta-grid">
					{#if project.client}
						<div class="meta-item">
							<span class="meta-label">Client</span>
							<span class="meta-value">{project.client}</span>
						</div>
					{/if}

					{#if project.year}
						<div class="meta-item">
							<span class="meta-label">Year</span>
							<span class="meta-value">{project.year}</span>
						</div>
					{/if}

					{#if project.role}
						<div class="meta-item">
							<span class="meta-label">Role</span>
							<span class="meta-value">{project.role}</span>
						</div>
					{/if}
				</div>

				{#if project.technologies && project.technologies.length > 0}
					<div class="technologies">
						{#each project.technologies as tech}
							<span class="tech-tag">{tech}</span>
						{/each}
					</div>
				{/if}

				{#if project.externalUrl}
					<div class="external-link-wrapper">
						<a
							href={project.externalUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="external-link"
						>
							Visit Project →
						</a>
					</div>
				{/if}
			</div>

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
			<nav class="project-nav">
				<a href="/" class="back-link">← Back to projects</a>
			</nav>
		</article>
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

	/* Project Content */
	.project-content {
		display: flex;
		flex-direction: column;
		gap: $unit-4x;
	}

	.project-details {
		display: flex;
		flex-direction: column;
		gap: $unit-3x;
		padding-bottom: $unit-3x;
		border-bottom: 1px solid $grey-90;
	}

	.meta-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: $unit-2x;

		.meta-item {
			display: flex;
			flex-direction: column;
			gap: $unit-half;
		}

		.meta-label {
			font-size: 0.875rem;
			color: $grey-60;
			text-transform: uppercase;
			letter-spacing: 0.05em;
		}

		.meta-value {
			font-size: 1rem;
			color: $grey-20;
			font-weight: 500;
		}
	}

	.technologies {
		display: flex;
		gap: $unit;
		flex-wrap: wrap;

		.tech-tag {
			padding: $unit $unit-2x;
			background: $grey-95;
			border-radius: 50px;
			font-size: 0.875rem;
			color: $grey-30;
		}
	}

	.external-link-wrapper {
		text-align: center;
	}

	.external-link {
		display: inline-block;
		padding: $unit-2x $unit-3x;
		background: $grey-10;
		color: white;
		text-decoration: none;
		border-radius: 50px;
		font-weight: 500;
		font-size: 0.925rem;
		transition: background-color 0.2s ease;

		&:hover {
			background: $grey-20;
		}
	}

	/* Case Study Section */
	.case-study-section {
		// No extra styling needed, content flows naturally
	}

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
			font-size: 1.0625rem;
			line-height: 1.65;
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
		padding-top: $unit-3x;
		border-top: 1px solid $grey-90;

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
	.project-nav {
		text-align: center;
		padding-top: $unit-3x;
		border-top: 1px solid $grey-90;
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
</style>
