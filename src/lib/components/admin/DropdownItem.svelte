<script lang="ts">
	interface Props {
		onclick?: (event: MouseEvent) => void
		variant?: 'default' | 'danger'
		disabled?: boolean
	}

	let { onclick, variant = 'default', disabled = false, children }: Props = $props()

	function handleClick(event: MouseEvent) {
		if (disabled) return
		event.stopPropagation()
		onclick?.(event)
	}
</script>

<button
	class="dropdown-item"
	class:danger={variant === 'danger'}
	class:disabled
	{disabled}
	onclick={handleClick}
>
	{@render children()}
</button>

<style lang="scss">
	@import '$styles/variables.scss';

	.dropdown-item {
		width: 100%;
		padding: $unit-2x $unit-3x;
		background: none;
		border: none;
		text-align: left;
		font-size: 0.875rem;
		color: $grey-20;
		cursor: pointer;
		transition: background-color 0.2s ease;

		&:hover:not(:disabled) {
			background-color: $grey-95;
		}

		&.danger {
			color: $red-60;
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}
</style>
