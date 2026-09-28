<script lang="ts">
	import type { Snippet } from 'svelte'
	let { title, children }: { title?: string; children: Snippet } = $props()
</script>

<div class="section">
	{#if title}<h4>{title}</h4>{/if}{@render children()}
</div>

<style lang="scss">
	.section {
		margin-bottom: $unit * 1.5;

		&:last-child {
			margin-bottom: 0;
		}

		h4 {
			margin: 0 0 $unit 0;
			color: $info-color;
			font-size: $font-size-small;
			font-weight: $font-weight-bold;
		}

		:global(p) {
			margin: $unit-half 0;
			line-height: 1.4;
		}

		:global(.flash) {
			animation: flash 0.5s ease-out;
		}
	}
	@keyframes flash {
		0% {
			background: rgba($success-color, 0.5);
		}
		100% {
			background: transparent;
		}
	}
</style>
