<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements'
	import type { Snippet } from 'svelte'

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
		icon?: Snippet
		children?: Snippet
		[key: string]: unknown
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
		icon,
		children,
		onclick,
		// eslint-disable-next-line svelte/valid-compile
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
	const hasIcon = $derived(!!icon)
	const hasDefaultSlot = $derived(!!children)
	const showSpinner = $derived(loading && !iconOnly)
</script>

{#if href}
	<a {href} class={buttonClass} class:disabled={disabled || loading}>
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
				{@render icon?.()}
			</span>
		{/if}

		{#if hasDefaultSlot && !iconOnly}
			<span class="btn-label">
				{@render children?.()}
			</span>
		{:else if iconOnly && hasIcon}
			{@render icon?.()}
		{/if}

		{#if hasIcon && iconPosition === 'right' && !iconOnly}
			<span class="btn-icon-wrapper">
				{@render icon?.()}
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
				{@render icon?.()}
			</span>
		{/if}

		{#if hasDefaultSlot && !iconOnly}
			<span class="btn-label">
				{@render children?.()}
			</span>
		{:else if iconOnly && hasIcon}
			{@render icon?.()}
		{/if}

		{#if hasIcon && iconPosition === 'right' && !iconOnly}
			<span class="btn-icon-wrapper">
				{@render icon?.()}
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
		transition: all $transition-fast ease;
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
			outline: $unit-2px solid rgba(59, 130, 246, 0.5);
			outline-offset: $unit-2px;
		}
	}

	// Size variations
	.btn-small {
		padding: $unit calc($unit * 1.5);
		font-size: 0.8125rem; // 13px
		border-radius: $unit-20px;
		min-height: $unit-3x + $unit-half;
	}

	.btn-medium {
		padding: ($unit * 1.5) $unit-2x;
		font-size: $unit-14px;
		border-radius: $unit-3x;
		min-height: $unit-4x + $unit-half;
	}

	.btn-large {
		padding: calc($unit * 1.5) $unit-3x;
		font-size: 0.9375rem; // 15px
		border-radius: $unit-3x + $unit-half;
		min-height: $unit-5x + $unit-half;
	}

	// Square corners variant
	.btn-square {
		&.btn-small {
			border-radius: $corner-radius-sm;
		}
		&.btn-medium {
			border-radius: $corner-radius-md;
		}
		&.btn-large {
			border-radius: $corner-radius-lg;
		}
	}

	// Icon-only button styles
	.btn-icon {
		padding: 0;
		border-radius: $corner-radius-md;

		&.btn-icon-small {
			width: $unit-3x + $unit-half;
			height: $unit-3x + $unit-half;
			border-radius: $corner-radius-sm;
		}

		&.btn-icon-medium {
			width: $unit-4x + $unit-2px;
			height: $unit-4x + $unit-2px;
		}

		&.btn-icon-large {
			width: $unit-5x + $unit-half;
			height: $unit-5x + $unit-half;
			border-radius: $corner-radius-lg;
		}

		&.btn-icon-icon {
			// For circular icon buttons
			width: $unit-4x + $unit-2px;
			height: $unit-4x + $unit-2px;
			border-radius: ($unit-4x + $unit-2px) / 2;
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
		background-color: $gray-10;
		color: $gray-80;
		border: $unit-1px solid $gray-20;

		&:hover:not(:disabled) {
			background-color: $gray-20;
			border-color: $gray-30;
		}

		&:active:not(:disabled) {
			background-color: $gray-30;
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
		color: $gray-20;

		&:hover:not(:disabled) {
			background-color: $gray-5;
			color: $gray-00;
		}

		&:active:not(:disabled) {
			background-color: $gray-10;
		}

		&.active {
			background-color: $gray-10;
			color: $gray-00;
		}
	}

	.btn-text {
		background: none;
		color: $gray-40;
		padding: $unit;

		&:hover:not(:disabled) {
			color: $gray-20;
			background-color: $gray-5;
		}

		&:active:not(:disabled) {
			color: $gray-00;
		}
	}

	.btn-danger-text {
		background: none;
		color: $error-text;
		padding: $unit;
		font-weight: 600;

		&:hover:not(:disabled) {
			background-color: $gray-90;
			color: $error-text;
		}

		&:active:not(:disabled) {
			background-color: $gray-80;
			color: $error-text;
		}
	}

	.btn-overlay {
		background-color: white;
		color: $gray-20;
		border: $unit-1px solid rgba(0, 0, 0, 0.1);
		box-shadow: 0 $unit-2px $unit-half rgba(0, 0, 0, 0.1);

		&:hover:not(:disabled) {
			background-color: $gray-5;
			color: $gray-00;
			box-shadow: 0 $unit-half $unit rgba(0, 0, 0, 0.15);
		}

		&:active:not(:disabled) {
			background-color: $gray-10;
			box-shadow: 0 $unit-1px $unit-2px rgba(0, 0, 0, 0.1);
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
