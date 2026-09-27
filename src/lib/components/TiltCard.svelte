<script lang="ts">
	import { createCardTilt } from '$lib/public/card-tilt.svelte'
	import type { Snippet } from 'svelte'
	let { children }: { children?: Snippet } = $props()
	const tilt = createCardTilt(5, 1.014)
</script>

<div
	class="tilt-card"
	bind:this={tilt.element}
	role="presentation"
	onmousemove={tilt.move}
	onmouseenter={tilt.enter}
	onmouseleave={tilt.leave}
	style="transform: {tilt.transform};"
>
	{#if children}{@render children()}{/if}
</div>

<style lang="scss">
	.tilt-card {
		transition:
			transform 0.15s ease-out,
			box-shadow 0.15s ease-out;
		transform-style: preserve-3d;
		will-change: transform;
		cursor: pointer;
		border-radius: $card-corner-radius;

		&:hover {
			box-shadow: $card-shadow-hover;
		}
	}
</style>
