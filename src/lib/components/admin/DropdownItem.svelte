<script lang="ts">
	import type { Snippet } from 'svelte'

	interface Props {
		onclick?: (event: MouseEvent) => void
		variant?: 'default' | 'danger'
		disabled?: boolean
		label?: string
		description?: string
		children?: Snippet
	}

	let {
		onclick,
		variant = 'default',
		disabled = false,
		label,
		description,
		children
	}: Props = $props()

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
	class:has-description={!!description}
	{disabled}
	onclick={handleClick}
>
	{#if label}
		<div class="dropdown-item-content">
			<div class="dropdown-item-label">{label}</div>
			{#if description}
				<div class="dropdown-item-description">{description}</div>
			{/if}
		</div>
	{:else if children}
		{@render children()}
	{/if}
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
		color: $gray-20;
		cursor: pointer;
		transition: background-color 0.2s ease;

		&.has-description {
			padding: $unit-2x $unit-3x;
		}

		&:hover:not(:disabled) {
			background-color: $gray-95;
		}

		&.danger {
			color: $red-60;

			.dropdown-item-label {
				color: $red-60;
			}
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}

	.dropdown-item-content {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.dropdown-item-label {
		font-size: 0.875rem;
		color: $gray-10;
		font-weight: 500;
		line-height: 1.4;
	}

	.dropdown-item-description {
		font-size: 0.75rem;
		color: $gray-40;
		line-height: 1.3;
	}
</style>
