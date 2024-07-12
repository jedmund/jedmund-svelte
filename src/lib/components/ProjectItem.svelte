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
		smoothness={0.1}
		containerHeight="220px"
		bounceStiffness={0.1}
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
		font-size: 18px;
		font-weight: bold;
		color: $red-60;
	}

	.project-description {
		margin: 0;
		font-size: 14px;
		line-height: 1.4;
		max-height: 2.8em;
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
	}
</style>
