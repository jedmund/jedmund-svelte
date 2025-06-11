<script lang="ts">
	import type { HTMLSelectAttributes } from 'svelte/elements'
	import ChevronDownIcon from '$icons/chevron-down.svg?raw'

	interface Option {
		value: string
		label: string
	}

	interface Props extends Omit<HTMLSelectAttributes, 'size'> {
		options: Option[]
		value?: string
		size?: 'small' | 'medium' | 'large'
		variant?: 'default' | 'minimal'
		fullWidth?: boolean
		pill?: boolean
	}

	let {
		options,
		value = $bindable(),
		size = 'medium',
		variant = 'default',
		fullWidth = false,
		pill = true,
		class: className = '',
		...restProps
	}: Props = $props()
</script>

<div class="select-wrapper">
	<select
		bind:value
		class="select select-{size} select-{variant} {className}"
		class:select-full-width={fullWidth}
		class:select-pill={pill}
		{...restProps}
	>
		{#each options as option}
			<option value={option.value}>{option.label}</option>
		{/each}
	</select>
	<div class="select-icon">
		{@html ChevronDownIcon}
	</div>
</div>

<style lang="scss">
	.select-wrapper {
		position: relative;
		display: inline-block;
		width: 100%;
	}

	.select {
		box-sizing: border-box;
		color: $grey-20;
		cursor: pointer;
		font-family: inherit;
		transition: all 0.2s ease;
		appearance: none;
		padding-right: 36px;
		width: 100%;

		&:focus {
			outline: none;
		}

		&:disabled {
			color: $grey-60;
			cursor: not-allowed;
			opacity: 0.6;
		}

		// Default variant
		&.select-default {
			border: 1px solid $grey-80;
			background: white;
			font-weight: 500;

			&:focus {
				border-color: $blue-50;
				box-shadow: 0 0 0 3px rgba(20, 130, 193, 0.1);
			}

			&:disabled {
				background: $grey-90;
			}
		}

		// Minimal variant
		&.select-minimal {
			border: none;
			background: $grey-90;
			font-weight: 500;

			&:hover {
				background: $grey-80;
			}

			&:focus {
				background: $grey-80;
			}

			&:disabled {
				background: transparent;
			}
		}

		// Size variants for default variant (accounting for border)
		&.select-default {
			&.select-small {
				padding: calc($unit - 1px) calc($unit * 1.5);
				font-size: 13px;
				min-height: 28px;
				min-width: 120px;
			}

			&.select-medium {
				padding: calc($unit - 1px) $unit-2x;
				font-size: 14px;
				min-height: 36px;
				min-width: 160px;
			}

			&.select-large {
				padding: calc($unit * 1.5 - 1px) $unit-3x;
				font-size: 15px;
				min-height: 44px;
				min-width: 180px;
			}
		}

		// Size variants for minimal variant (no border, card-sized border radius)
		&.select-minimal {
			&.select-small {
				padding: $unit calc($unit * 1.5);
				font-size: 13px;
				min-height: 28px;
				min-width: 120px;
				border-radius: $corner-radius;
			}

			&.select-medium {
				padding: $unit $unit-2x;
				font-size: 14px;
				min-height: 36px;
				min-width: 160px;
				border-radius: $corner-radius;
			}

			&.select-large {
				padding: calc($unit * 1.5) $unit-3x;
				font-size: 15px;
				min-height: 44px;
				min-width: 180px;
				border-radius: $card-corner-radius;
			}
		}

		// Shape variants for default variant only (minimal already has card radius)
		&.select-default.select-pill {
			&.select-small {
				border-radius: 20px;
			}
			&.select-medium {
				border-radius: 24px;
			}
			&.select-large {
				border-radius: 28px;
			}
		}

		&.select-default:not(.select-pill) {
			&.select-small {
				border-radius: 6px;
			}
			&.select-medium {
				border-radius: 8px;
			}
			&.select-large {
				border-radius: 10px;
			}
		}

		// Width variants
		&.select-full-width {
			width: 100%;
			min-width: auto;
		}
	}

	.select-icon {
		position: absolute;
		right: 12px;
		top: 50%;
		transform: translateY(-50%);
		pointer-events: none;
		color: $grey-60;
		display: flex;
		align-items: center;
		justify-content: center;

		:global(svg) {
			width: 16px;
			height: 16px;
		}
	}

	// Full width handling for wrapper
	.select-wrapper:has(.select-full-width) {
		width: 100%;
	}
</style>
