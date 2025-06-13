<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements'

	interface Props extends HTMLButtonAttributes {
		variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'text' | 'overlay' | 'danger-text'
		buttonSize?: 'small' | 'medium' | 'large' | 'icon'
		iconOnly?: boolean
		iconPosition?: 'left' | 'right'
		pill?: boolean
		fullWidth?: boolean
		loading?: boolean
		active?: boolean
		href?: string
		class?: string
	}

	let {
		variant = 'primary',
		buttonSize = 'medium',
		iconOnly = false,
		iconPosition = 'left',
		pill = true,
		fullWidth = false,
		loading = false,
		active = false,
		disabled = false,
		type = 'button',
		href,
		class: className = '',
		children,
		onclick,
		...restProps
	}: Props = $props()

	// Compute button classes
	const buttonClass = $derived.by(() => {
		const classes = ['btn']

		// Variant
		classes.push(`btn-${variant}`)

		// Size
		if (!iconOnly) {
			classes.push(`btn-${buttonSize}`)
		} else {
			classes.push('btn-icon')
			classes.push(`btn-icon-${buttonSize}`)
		}

		// States
		if (active) classes.push('active')
		if (loading) classes.push('loading')
		if (fullWidth) classes.push('full-width')
		if (!pill && !iconOnly) classes.push('btn-square')

		// Custom class
		if (className) classes.push(className)

		return classes.join(' ')
	})

	// Handle icon slot positioning
	const hasIcon = $derived(!!$$slots.icon)
	const hasDefaultSlot = $derived(!!$$slots.default)
	const showSpinner = $derived(loading && !iconOnly)
</script>

{#if href}
	<a {href} class={buttonClass} class:disabled={disabled || loading} {...restProps}>
		{#if showSpinner}
			<svg class="btn-spinner" width="16" height="16" viewBox="0 0 16 16">
				<circle
					cx="8"
					cy="8"
					r="6"
					stroke="currentColor"
					stroke-width="2"
					fill="none"
					stroke-dasharray="25"
					stroke-dashoffset="25"
					stroke-linecap="round"
				>
					<animateTransform
						attributeName="transform"
						type="rotate"
						from="0 8 8"
						to="360 8 8"
						dur="1s"
						repeatCount="indefinite"
					/>
				</circle>
			</svg>
		{/if}

		{#if hasIcon && iconPosition === 'left' && !iconOnly}
			<span class="btn-icon-wrapper">
				<slot name="icon" />
			</span>
		{/if}

		{#if hasDefaultSlot && !iconOnly}
			<span class="btn-label">
				<slot />
			</span>
		{:else if iconOnly && hasIcon}
			<slot name="icon" />
		{/if}

		{#if hasIcon && iconPosition === 'right' && !iconOnly}
			<span class="btn-icon-wrapper">
				<slot name="icon" />
			</span>
		{/if}
	</a>
{:else}
	<button class={buttonClass} {type} disabled={disabled || loading} {onclick} {...restProps}>
		{#if showSpinner}
			<svg class="btn-spinner" width="16" height="16" viewBox="0 0 16 16">
				<circle
					cx="8"
					cy="8"
					r="6"
					stroke="currentColor"
					stroke-width="2"
					fill="none"
					stroke-dasharray="25"
					stroke-dashoffset="25"
					stroke-linecap="round"
				>
					<animateTransform
						attributeName="transform"
						type="rotate"
						from="0 8 8"
						to="360 8 8"
						dur="1s"
						repeatCount="indefinite"
					/>
				</circle>
			</svg>
		{/if}

		{#if hasIcon && iconPosition === 'left' && !iconOnly}
			<span class="btn-icon-wrapper">
				<slot name="icon" />
			</span>
		{/if}

		{#if hasDefaultSlot && !iconOnly}
			<span class="btn-label">
				<slot />
			</span>
		{:else if iconOnly && hasIcon}
			<slot name="icon" />
		{/if}

		{#if hasIcon && iconPosition === 'right' && !iconOnly}
			<span class="btn-icon-wrapper">
				<slot name="icon" />
			</span>
		{/if}
	</button>
{/if}

<style lang="scss">
	@import '$styles/variables.scss';

	// Base button styles
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: $unit;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		font-weight: 400;
		border: none;
		cursor: pointer;
		transition: all 0.15s ease;
		outline: none;
		position: relative;
		white-space: nowrap;
		text-decoration: none;
		box-sizing: border-box;

		&:disabled,
		&.disabled {
			opacity: 0.5;
			cursor: not-allowed;
			pointer-events: none;
		}

		&.loading {
			color: transparent;
		}

		&.full-width {
			width: 100%;
		}

		// Ensure consistent styling for both button and anchor elements
		&:focus {
			outline: 2px solid rgba(59, 130, 246, 0.5);
			outline-offset: 2px;
		}
	}

	// Size variations
	.btn-small {
		padding: $unit calc($unit * 1.5);
		font-size: 13px;
		border-radius: 20px;
		min-height: 28px;
	}

	.btn-medium {
		padding: ($unit * 1.5) $unit-2x;
		font-size: 14px;
		border-radius: 24px;
		min-height: 36px;
	}

	.btn-large {
		padding: calc($unit * 1.5) $unit-3x;
		font-size: 15px;
		border-radius: 28px;
		min-height: 44px;
	}

	// Square corners variant
	.btn-square {
		&.btn-small {
			border-radius: 6px;
		}
		&.btn-medium {
			border-radius: 8px;
		}
		&.btn-large {
			border-radius: 10px;
		}
	}

	// Icon-only button styles
	.btn-icon {
		padding: 0;
		border-radius: 8px;

		&.btn-icon-small {
			width: 28px;
			height: 28px;
			border-radius: 6px;
		}

		&.btn-icon-medium {
			width: 34px;
			height: 34px;
		}

		&.btn-icon-large {
			width: 44px;
			height: 44px;
			border-radius: 10px;
		}

		&.btn-icon-icon {
			// For circular icon buttons
			width: 34px;
			height: 34px;
			border-radius: 17px;
		}
	}

	// Variant styles
	.btn-primary {
		background-color: $red-60;
		color: white;

		&:hover:not(:disabled) {
			background-color: $red-80;
		}

		&:active:not(:disabled) {
			background-color: $red-40;
		}
	}

	.btn-secondary {
		background-color: $grey-10;
		color: $grey-80;
		border: 1px solid $grey-20;

		&:hover:not(:disabled) {
			background-color: $grey-20;
			border-color: $grey-30;
		}

		&:active:not(:disabled) {
			background-color: $grey-30;
		}
	}

	.btn-danger {
		background-color: $yellow-60;
		color: $yellow-10;

		&:hover:not(:disabled) {
			background-color: $yellow-50;
		}

		&:active:not(:disabled) {
			background-color: $yellow-40;
		}
	}

	.btn-ghost {
		background-color: transparent;
		color: $grey-20;

		&:hover:not(:disabled) {
			background-color: $grey-5;
			color: $grey-00;
		}

		&:active:not(:disabled) {
			background-color: $grey-10;
		}

		&.active {
			background-color: $grey-10;
			color: $grey-00;
		}
	}

	.btn-text {
		background: none;
		color: $grey-40;
		padding: $unit;

		&:hover:not(:disabled) {
			color: $grey-20;
			background-color: $grey-5;
		}

		&:active:not(:disabled) {
			color: $grey-00;
		}
	}

	.btn-danger-text {
		background: none;
		color: #dc2626;
		padding: $unit;
		font-weight: 600;

		&:hover:not(:disabled) {
			background-color: $grey-90;
			color: #dc2626;
		}

		&:active:not(:disabled) {
			background-color: $grey-80;
			color: #dc2626;
		}
	}

	.btn-overlay {
		background-color: white;
		color: $grey-20;
		border: 1px solid rgba(0, 0, 0, 0.1);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

		&:hover:not(:disabled) {
			background-color: $grey-5;
			color: $grey-00;
			box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
		}

		&:active:not(:disabled) {
			background-color: $grey-10;
			box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
		}
	}

	// Icon wrapper
	.btn-icon-wrapper {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	// Loading spinner
	.btn-spinner {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		color: currentColor;
	}

	// Label wrapper
	.btn-label {
		line-height: 1;
	}

	// Special states
	.btn.active {
		&.btn-ghost {
			background-color: rgba($blue-50, 0.1);
			color: $blue-50;
		}
	}

	// Icon color inheritance
	:global(.btn svg) {
		color: currentColor;
		flex-shrink: 0;
	}
</style>
