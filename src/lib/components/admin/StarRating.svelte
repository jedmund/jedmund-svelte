<script lang="ts">
	import StarIcon from '$icons/star.svg?component'

	interface Props {
		value: number | null
	}

	let { value = $bindable() }: Props = $props()

	let hoverStar = $state(0)
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="star-rating-container">
	<div class="star-row" onmouseleave={() => (hoverStar = 0)}>
		{#each [1, 2, 3, 4, 5] as star}
			<button
				type="button"
				class="star-button"
				class:filled={value != null && hoverStar === 0 && star <= value}
				class:hovered={hoverStar > 0 && star <= hoverStar}
				onclick={() => (value = value === star ? null : star)}
				onmouseenter={() => (hoverStar = star)}
				aria-label="{star} star{star > 1 ? 's' : ''}"
			>
				<StarIcon />
			</button>
		{/each}
	</div>
	{#if value != null}
		<button type="button" class="star-clear" onclick={() => (value = null)}> Clear </button>
	{/if}
</div>

<style lang="scss">
	.star-rating-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: $unit;
	}

	.star-row {
		display: flex;
		align-items: center;
		gap: $unit-half;
	}

	.star-button {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		display: flex;
		align-items: center;

		:global(svg) {
			width: 48px;
			height: 48px;
			fill: $gray-85;
			transition: fill $transition-fast ease;
		}

		&.hovered :global(svg) {
			fill: $red-90;
		}

		&.filled :global(svg) {
			fill: $red-50;
		}

		&.filled.hovered :global(svg) {
			fill: $red-90;
		}
	}

	.star-clear {
		background: none;
		border: none;
		cursor: pointer;
		font-size: $font-size-small;
		color: $gray-50;
		padding: $unit-half $unit-2x;

		&:hover {
			color: $gray-20;
		}
	}
</style>
