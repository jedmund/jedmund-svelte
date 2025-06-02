<script lang="ts">
	interface Props {
		sections: string[]
	}

	let { sections }: Props = $props()
</script>

<div class="admin-byline">
	{#each sections as section, index}
		<span class="byline-section">{section}</span>
		{#if index < sections.length - 1}
			<span class="separator">&middot;</span>
		{/if}
	{/each}
</div>

<style lang="scss">
	.admin-byline {
		display: flex;
		align-items: center;
		gap: $unit;
		font-size: 0.875rem;
		color: $grey-40;
		flex-wrap: wrap;

		.byline-section {
			// Remove text-transform: capitalize to allow proper sentence case
		}

		.separator {
			color: $grey-40;
		}
	}

	// Responsive adjustments
	@media (max-width: 480px) {
		.admin-byline {
			font-size: 0.875rem;
			gap: $unit-half;
		}
	}
</style>