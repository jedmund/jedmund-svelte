<script lang="ts">
	import ProjectItem from '$components/ProjectItem.svelte'
	import type { Project } from '$lib/types/project'

	interface Props {
		projects: Project[]
	}

	let { projects = [] }: Props = $props()
</script>

<section class="projects">
	<ul>
		<li>
			<div class="intro-card">
				<p class="intro-text">
					<span class="highlighted">@jedmund</span> is a software designer and strategist based out of
					San Francisco.
				</p>
				<p class="intro-text">
					In his 15 year career, he's focused his design practice on building tools that help people
					connect with technology—and their own creativity.
				</p>
			</div>
		</li>
		{#if projects.length === 0}
			<li>
				<div class="no-projects">No projects found</div>
			</li>
		{/if}
		{#each projects as project, index}
			<li>
				<ProjectItem 
					logoUrl={project.logoUrl}
					backgroundColor={project.backgroundColor || '#f7f7f7'}
					name={project.title}
					description={project.description || ''}
					highlightColor={project.highlightColor || '#333'}
					{index} 
				/>
			</li>
		{/each}
	</ul>
</section>

<style lang="scss">
	.projects {
		display: flex;
		justify-content: center;
		width: 100%;

		ul {
			display: flex;
			flex-direction: column;
			list-style: none;
			padding: 0;
			width: 100%;
			max-width: 700px;
			gap: $unit-3x;
			margin: 0;

			li {
				width: 100%;
			}
		}
	}

	.intro-card {
		padding: $unit-3x;
		background: $grey-100;
		border-radius: $card-corner-radius;
	}

	.intro-text {
		margin: 0;
		font-size: 1.125rem; // 18px
		line-height: 1.3;
		color: $grey-00;

		&:not(:last-child) {
			margin-bottom: $unit-2x;
		}

		.highlighted {
			color: #d0290d;
		}
	}

	.no-projects {
		padding: $unit-3x;
		text-align: center;
		color: $grey-40;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
	}
</style>