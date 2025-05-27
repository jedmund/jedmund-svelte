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
		highlightColor: string
	}

	const projects: Project[] = [
		{
			SVGComponent: MaitsuLogo,
			backgroundColor: '#FFF7EA',
			name: 'Maitsu',
			description: 'Maitsu is a hobby journal that helps people make something new every week.',
			highlightColor: '#F77754'
		},
		{
			SVGComponent: SlackLogo,
			backgroundColor: '#4a154b',
			name: 'Slack',
			description:
				'At Slack, I helped redefine strategy for Workflows and other features in under the automation umbrella.',
			highlightColor: '#611F69'
		},
		{
			SVGComponent: FigmaLogo,
			backgroundColor: '#2c2c2c',
			name: 'Figma',
			description:
				'At Figma, I designed features and led R&D and strategy for the nascent prototyping team.',
			highlightColor: '#0ACF83'
		},
		{
			SVGComponent: PinterestLogo,
			backgroundColor: '#f7f7f7',
			name: 'Pinterest',
			description:
				'At Pinterest, I was the first product design hired, and touched almost every part of the product.',
			highlightColor: '#CB1F27'
		}
	]
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
		{#each projects as project, index}
			<li>
				<ProjectItem {...project} {index} />
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
</style>
