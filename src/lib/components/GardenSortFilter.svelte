<script lang="ts">
	interface Props {
		sort: string
		bangers: boolean
		onSortChange: (sort: string) => void
		onBangersToggle: (active: boolean) => void
	}

	let { sort, bangers, onSortChange, onBangersToggle }: Props = $props()

	const SORT_OPTIONS = [
		{ value: 'display-order', label: 'Default' },
		{ value: 'a-to-z', label: 'A to Z' },
		{ value: 'z-to-a', label: 'Z to A' },
		{ value: 'recently-added', label: 'Recently added' },
		{ value: 'oldest-added', label: 'Oldest added' },
		{ value: 'recently-released', label: 'Recently released' },
		{ value: 'oldest-released', label: 'Oldest released' }
	]
</script>

<div class="sort-filter">
	<select
		class="sort-select"
		value={sort}
		onchange={(e) => onSortChange(e.currentTarget.value)}
	>
		{#each SORT_OPTIONS as option}
			<option value={option.value}>{option.label}</option>
		{/each}
	</select>

	<button
		class="bangers-toggle"
		class:active={bangers}
		onclick={() => onBangersToggle(!bangers)}
	>
		Bangers only
	</button>
</div>

<style lang="scss">
	.sort-filter {
		display: flex;
		align-items: center;
		gap: $unit;
		flex-wrap: wrap;
		width: 100%;
	}

	.sort-select {
		appearance: none;
		background-color: $gray-95;
		color: $gray-20;
		border: none;
		border-radius: $corner-radius-full;
		padding: $unit-half $unit-2x $unit-half $unit;
		font-size: $font-size-small;
		font-family: inherit;
		cursor: pointer;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right $unit center;
		padding-right: $unit-3x;
		transition: background-color $transition-fast ease;

		&:hover {
			background-color: $gray-90;
		}

		&:focus-visible {
			outline: 2px solid $accent-color;
			outline-offset: 1px;
		}
	}

	.bangers-toggle {
		appearance: none;
		border: none;
		border-radius: $corner-radius-full;
		padding: $unit-half $unit;
		font-size: $font-size-small;
		font-family: inherit;
		font-weight: $font-weight-med;
		cursor: pointer;
		background-color: $gray-95;
		color: $gray-40;
		transition:
			background-color $transition-fast ease,
			color $transition-fast ease;

		&:hover {
			background-color: $gray-90;
			color: $gray-20;
		}

		&.active {
			background-color: $blue-95;
			color: $blue-40;
		}

		&:focus-visible {
			outline: 2px solid $accent-color;
			outline-offset: 1px;
		}
	}
</style>
