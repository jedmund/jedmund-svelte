<script lang="ts">
	import ProjectItem from '$components/ProjectItem.svelte'

	import MaitsuLogo from '$illos/logo-maitsu.svg?component'
	import SlackLogo from '$illos/logo-slack.svg?component'
	import FigmaLogo from '$illos/logo-figma.svg?component'
	import PinterestLogo from '$illos/logo-pinterest.svg?component'
	import SVGHoverEffect from '$components/SVGHoverEffect.svelte'

	interface Project {
		SVGComponent: typeof SvelteComponent
		backgroundColor: string
		name: string
		description: string
	}

	const projects: Project[] = [
		{
			SVGComponent: MaitsuLogo,
			backgroundColor: '#FFF7EA',
			name: 'Maitsu',
			description:
				"As a personal project, I'm building a hobby journal that helps people make something new every week."
		},
		{
			SVGComponent: SlackLogo,
			backgroundColor: '#4a154b',
			name: 'Slack',
			description:
				'I led design for Workflows and other consumer-facing automation features at Slack.'
		},
		{
			SVGComponent: FigmaLogo,
			backgroundColor: '#2c2c2c',
			name: 'Figma',
			description: 'I helped lead and set the direction for the early prototyping team at Figma.'
		},
		{
			SVGComponent: PinterestLogo,
			backgroundColor: '#f7f7f7',
			name: 'Pinterest',
			description:
				'As the first design hire at Pinterest, I helped define product direction and grow the design team.'
		}
	]
</script>

<section class="projects">
	<ul>
		{#each projects as project}
			<li>
				<ProjectItem {...project} />
			</li>
		{/each}
	</ul>
</section>

<style lang="scss">
	.projects ul {
		display: grid;
		grid-template-columns: 1fr 1fr;
		list-style: none;
		padding: 0;
		width: 100%;
		gap: $unit-4x;
		margin: 0;

		@include breakpoint('phone') {
			grid-template-columns: 1fr;
		}

		li {
			flex: 0 0 calc(50% - #{$unit-2x}); /* 50% width minus gap */
			box-sizing: border-box;
		}
	}
</style>
