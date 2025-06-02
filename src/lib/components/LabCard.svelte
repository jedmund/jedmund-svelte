<script lang="ts">
	import type { Project } from '$lib/types/project'
	import Button from './admin/Button.svelte'

	const { project }: { project: Project } = $props()

	// Determine if the project is clickable (not list-only)
	const isClickable = $derived(project.status !== 'list-only')
	const projectUrl = $derived(`/labs/${project.slug}`)

	// Tilt card functionality
	let cardElement: HTMLElement
	let isHovering = $state(false)
	let transform = $state('')

	function handleMouseMove(e: MouseEvent) {
		if (!cardElement || !isHovering) return

		const rect = cardElement.getBoundingClientRect()
		const x = e.clientX - rect.left
		const y = e.clientY - rect.top

		const centerX = rect.width / 2
		const centerY = rect.height / 2

		const rotateX = ((y - centerY) / centerY) * -3 // Subtle tilt
		const rotateY = ((x - centerX) / centerX) * 3

		transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`
	}

	function handleMouseEnter() {
		isHovering = true
	}

	function handleMouseLeave() {
		isHovering = false
		transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)'
	}
</script>

{#if isClickable}
	<a
		href={projectUrl}
		class="lab-card clickable"
		bind:this={cardElement}
		onmousemove={handleMouseMove}
		onmouseenter={handleMouseEnter}
		onmouseleave={handleMouseLeave}
		style:transform
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
					Visit site
					<svg
						slot="icon"
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
					</svg>
				</Button>
			{/if}
		</div>

		<p class="project-description">{project.description}</p>

		<!-- Add status indicators for different project states -->
		{#if project.status === 'password-protected'}
			<div class="status-indicator password-protected">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
					<rect
						x="3"
						y="11"
						width="18"
						height="11"
						rx="2"
						ry="2"
						stroke="currentColor"
						stroke-width="2"
					/>
					<circle cx="12" cy="16" r="1" fill="currentColor" />
					<path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2" />
				</svg>
				<span>Password Protected</span>
			</div>
		{/if}
	</a>
{:else}
	<article
		class="lab-card"
		bind:this={cardElement}
		onmousemove={handleMouseMove}
		onmouseenter={handleMouseEnter}
		onmouseleave={handleMouseLeave}
		style:transform
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
		{#if project.status === 'list-only'}
			<div class="status-indicator list-only">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
					<path
						d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
					<path
						d="M1 1l22 22"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
				<span>View Only</span>
			</div>
		{/if}
	</article>
{/if}

<style lang="scss">
	.lab-card {
		background: $grey-100;
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

		// Prevent overflow issues with 3D transforms
		-webkit-mask-image: -webkit-radial-gradient(white, black);
		mask-image: radial-gradient(white, black);

		&:hover {
			box-shadow:
				0 10px 30px rgba(0, 0, 0, 0.12),
				0 2px 10px rgba(0, 0, 0, 0.08);

			.project-title {
				color: $red-60;
			}
		}

		&.clickable {
			cursor: pointer;
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
		}
	}

	.project-title-container {
		display: flex;
		flex-direction: column;
		gap: $unit-half;
	}

	.project-title {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 400;
		color: $grey-00;
		line-height: 1.3;

		@include breakpoint('phone') {
			font-size: 1.125rem;
		}
	}

	.project-year {
		font-size: 0.875rem;
		color: $grey-40;
		font-weight: 400;
		white-space: nowrap;
	}

	.project-description {
		margin: 0 0 $unit-3x 0;
		font-size: 1.125rem;
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
				background: darken($labs-color, 10%);
				transform: translateY(-1px);
			}

			&.external {
				pointer-events: none; // Prevent clicking when it's inside a clickable card
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

	.status-indicator {
		display: flex;
		align-items: center;
		gap: $unit;
		font-size: 0.875rem;
		padding: $unit $unit-2x;
		border-radius: $unit-2x;
		margin-top: $unit-2x;

		&.list-only {
			background: rgba(239, 68, 68, 0.1);
			color: #dc2626;
		}

		&.password-protected {
			background: rgba(251, 191, 36, 0.1);
			color: #d97706;
		}

		svg {
			width: 14px;
			height: 14px;
			flex-shrink: 0;
		}

		span {
			font-weight: 500;
		}
	}
</style>
