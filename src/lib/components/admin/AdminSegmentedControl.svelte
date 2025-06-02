<script lang="ts">
	interface Props {
		options: Array<{ value: string; label: string }>
		value: string
		onChange: (value: string) => void
	}

	let { options, value, onChange }: Props = $props()
</script>

<div class="segmented-control">
	{#each options as option}
		<button
			class="segment"
			class:active={value === option.value}
			onclick={() => onChange(option.value)}
		>
			{option.label}
		</button>
	{/each}
</div>

<style lang="scss">
	.segmented-control {
		display: inline-flex;
		background-color: $grey-95;
		border-radius: 50px;
		padding: $unit-half;
		gap: $unit-half;
	}

	.segment {
		padding: $unit $unit-3x;
		background: transparent;
		border: none;
		border-radius: 50px;
		font-size: 0.925rem;
		color: $grey-40;
		cursor: pointer;
		transition: all 0.2s ease;

		&:hover:not(.active) {
			color: $grey-20;
		}

		&.active {
			background-color: white;
			color: $grey-10;
			box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		}
	}
</style>
