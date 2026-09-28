<script lang="ts">
	import type { Snippet } from 'svelte'

	interface Props {
		left?: Snippet
		right?: Snippet
	}

	let { left, right }: Props = $props()
</script>

<div class="admin-filters">
	<div class="filters-left">
		{#if left}
			{@render left()}
		{/if}
	</div>
	<div class="filters-right">
		{#if right}
			{@render right()}
		{/if}
	</div>
</div>

<style lang="scss">
	.admin-filters {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: $unit-2x;
		min-width: 0;
		padding: 0 $unit-2x 0 $unit;
		margin-bottom: $unit-2x;
	}

	.filters-left {
		display: flex;
		gap: $unit-2x;
		align-items: center;
		flex-wrap: wrap;
		min-width: 0;
	}

	.filters-right {
		display: flex;
		gap: $unit-2x;
		align-items: center;
		flex-wrap: wrap;
		min-width: 0;
		flex-shrink: 1;
	}
</style>
