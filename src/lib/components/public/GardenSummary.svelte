<script lang="ts">
	let { cleanedSummary }: { cleanedSummary: string } = $props()
	let summaryExpanded = $state(false)
	let summaryOverflows = $state(false)
	let summaryEl: HTMLParagraphElement | undefined = $state()

	$effect(() => {
		if (summaryEl && !summaryExpanded) {
			summaryOverflows = summaryEl.scrollHeight > summaryEl.clientHeight
		}
	})
</script>

{#if cleanedSummary}
	<p class="item-summary" class:collapsed={!summaryExpanded} bind:this={summaryEl}>
		{cleanedSummary}
	</p>
	{#if summaryOverflows || summaryExpanded}
		<button class="summary-toggle" onclick={() => (summaryExpanded = !summaryExpanded)}>
			{summaryExpanded ? 'Show less' : 'Read more'}
		</button>
	{/if}
{/if}

<style lang="scss">
	.item-summary {
		font-size: $font-size-small;
		line-height: 1.5;
		color: $gray-30;
		margin: 0;
		white-space: pre-line;

		&.collapsed {
			display: -webkit-box;
			-webkit-line-clamp: 3;
			line-clamp: 3;
			-webkit-box-orient: vertical;
			overflow: hidden;
		}
	}

	.summary-toggle {
		background: none;
		border: none;
		padding: 0;
		font-size: $font-size-small;
		color: $gray-50;
		cursor: pointer;
		margin-top: $unit-half;
		margin-bottom: $unit-2x;
		align-self: flex-start;
		transition: color $transition-fast ease;

		&:hover {
			color: $red-50;
		}
	}
</style>
