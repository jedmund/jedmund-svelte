<script lang="ts">
	import SVGHoverEffect from '$components/SVGHoverEffect.svelte'
	import type { SvelteComponent } from 'svelte'

	export let SVGComponent: typeof SvelteComponent
	export let backgroundColor: string
	export let name: string
	export let description: string
</script>

<div class="project-item">
	<SVGHoverEffect
		{SVGComponent}
		{backgroundColor}
		maxMovement={10}
		containerHeight="220px"
		bounceDamping={0.2}
	/>
	<h3 class="project-name">{name}</h3>
	<p class="project-description">{description}</p>
</div>

<style lang="scss">
	.project-item {
		display: flex;
		flex-direction: column;
		gap: $unit;
	}

	.project-name {
		margin: $unit 0 $unit-half;
		font-size: 1rem;
		font-weight: bold;
		color: $red-60;
	}

	.project-description {
		margin: 0;
		font-size: 1rem;
		line-height: 1.3;
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
	}

	@include breakpoint('phone') {
		.project-description {
			-webkit-line-clamp: none;
			overflow: visible;
			max-height: fit-content;
		}
	}
</style>
