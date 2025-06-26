<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements'

	type Props = HTMLInputAttributes & {
		type?:
			| 'text'
			| 'email'
			| 'password'
			| 'url'
			| 'search'
			| 'number'
			| 'tel'
			| 'date'
			| 'time'
			| 'color'
		label?: string
		error?: string
		helpText?: string
		size?: 'small' | 'medium' | 'large' | 'jumbo'
		pill?: boolean
		fullWidth?: boolean
		required?: boolean
		class?: string
		wrapperClass?: string
		inputClass?: string
		prefixIcon?: boolean
		suffixIcon?: boolean
		showCharCount?: boolean
		maxLength?: number
		colorSwatch?: boolean // Show color swatch based on input value
	}

	let {
		label,
		error,
		helpText,
		size = 'medium',
		pill = false,
		fullWidth = true,
		required = false,
		disabled = false,
		readonly = false,
		type = 'text',
		value = $bindable(''),
		class: className = '',
		wrapperClass = '',
		inputClass = '',
		prefixIcon = false,
		suffixIcon = false,
		showCharCount = false,
		maxLength,
		colorSwatch = false,
		id = `input-${Math.random().toString(36).substr(2, 9)}`,
		...restProps
	}: Props = $props()

	let charCount = $derived(String(value).length)
	let charsRemaining = $derived(maxLength ? maxLength - charCount : 0)

	// Color swatch validation and display
	const isValidHexColor = $derived(() => {
		if (!colorSwatch || !value) return false
		const hexRegex = /^#[0-9A-Fa-f]{6}$/
		return hexRegex.test(String(value))
	})

	// Color picker functionality
	let colorPickerInput: HTMLInputElement

	function handleColorSwatchClick() {
		if (colorPickerInput) {
			colorPickerInput.click()
		}
	}

	function handleColorPickerChange(event: Event) {
		const target = event.target as HTMLInputElement
		if (target.value) {
			value = target.value.toUpperCase()
		}
	}

	// Compute classes
	const wrapperClasses = $derived(() => {
		const classes = ['input-wrapper']
		if (size) classes.push(`input-wrapper-${size}`)
		if (fullWidth) classes.push('full-width')
		if (error) classes.push('has-error')
		if (disabled) classes.push('is-disabled')
		if (prefixIcon) classes.push('has-prefix-icon')
		if (suffixIcon) classes.push('has-suffix-icon')
		if (colorSwatch) classes.push('has-color-swatch')
		if (wrapperClass) classes.push(wrapperClass)
		if (className) classes.push(className)
		return classes.join(' ')
	})

	const inputClasses = $derived(() => {
		const classes = ['input']
		classes.push(`input-${size}`)
		if (pill) classes.push('input-pill')
		if (inputClass) classes.push(inputClass)
		return classes.join(' ')
	})
</script>

<div class={wrapperClasses()}>
	{#if label}
		<label for={id} class="input-label">
			{label}
			{#if required}
				<span class="required-indicator">*</span>
			{/if}
		</label>
	{/if}

	<div class="input-container">
		{#if prefixIcon}
			<span class="input-icon prefix-icon">
				<slot name="prefix" />
			</span>
		{/if}

		{#if colorSwatch && isValidHexColor}
			<span
				class="color-swatch"
				style="background-color: {value}"
				onclick={handleColorSwatchClick}
				role="button"
				tabindex="0"
				aria-label="Open color picker"
			></span>
		{/if}

		<input
			bind:value
			{id}
			{type}
			{disabled}
			{readonly}
			{required}
			{maxLength}
			class={inputClasses()}
			{...restProps}
		/>

		{#if suffixIcon}
			<span class="input-icon suffix-icon">
				<slot name="suffix" />
			</span>
		{/if}

		{#if colorSwatch}
			<input
				bind:this={colorPickerInput}
				type="color"
				value={isValidHexColor ? String(value) : '#000000'}
				oninput={handleColorPickerChange}
				onchange={handleColorPickerChange}
				style="position: absolute; visibility: hidden; pointer-events: none;"
				tabindex="-1"
			/>
		{/if}
	</div>

	{#if (error || helpText || showCharCount) && !disabled}
		<div class="input-footer">
			{#if error}
				<span class="input-error">{error}</span>
			{:else if helpText}
				<span class="input-help">{helpText}</span>
			{/if}

			{#if showCharCount && maxLength}
				<span
					class="char-count"
					class:warning={charsRemaining < maxLength * 0.1}
					class:error={charsRemaining < 0}
				>
					{charsRemaining}
				</span>
			{/if}
		</div>
	{/if}
</div>

<style lang="scss">
	@import '$styles/variables.scss';

	// Wrapper styles
	.input-wrapper {
		display: inline-block;
		position: relative;

		&.full-width {
			display: block;
			width: 100%;
		}

		&.has-error {
			.input {
				border-color: $red-50;

				&:focus {
					border-color: $red-50;
				}
			}
		}

		&.is-disabled {
			opacity: 0.6;
		}

		&.has-color-swatch {
			.input {
				padding-left: 36px; // Make room for color swatch (20px + 8px margin + 8px padding)
			}
		}
	}

	// Label styles
	.input-label {
		display: block;
		margin-bottom: $unit;
		font-size: 14px;
		font-weight: 500;
		color: $gray-20;
	}

	.required-indicator {
		color: $red-50;
		margin-left: 2px;
	}

	// Container for input and icons
	.input-container {
		position: relative;
		display: flex;
		align-items: stretch;
		width: 100%;
	}

	// Color swatch styles
	.color-swatch {
		position: absolute;
		left: 8px;
		top: 50%;
		transform: translateY(-50%);
		width: 20px;
		height: 20px;
		border-radius: 4px;
		border: 1px solid rgba(0, 0, 0, 0.1);
		z-index: 1;
		cursor: pointer;
		transition: border-color 0.15s ease;

		&:hover {
			border-color: rgba(0, 0, 0, 0.2);
		}
	}

	// Input styles
	.input {
		width: 100%;
		border: 1px solid transparent;
		color: $input-text-color;
		background-color: $input-background-color;
		transition: all 0.15s ease;

		&:hover {
			background-color: $input-background-color-hover;
			color: $input-text-color-hover;
		}

		&::placeholder {
			color: $gray-50;
		}

		&:focus {
			outline: none;
			background-color: $input-background-color-hover;
			color: $input-text-color-hover;
		}

		&:disabled {
			background-color: $gray-95;
			cursor: not-allowed;
			color: $gray-40;
		}

		&:read-only {
			background-color: $gray-97;
			cursor: default;
		}
	}

	// Size variations
	.input-small {
		padding: $unit calc($unit * 1.5);
		font-size: 0.75rem;
	}

	.input-medium {
		padding: calc($unit * 1.5) $unit-2x;
		font-size: 1rem;
	}

	.input-large {
		padding: $unit-2x $unit-3x;
		font-size: 1.25rem;
		box-sizing: border-box;
	}

	.input-jumbo {
		padding: $unit-2x $unit-2x;
		font-size: 1.33rem;
		box-sizing: border-box;
	}

	// Shape variants - pill vs rounded
	.input-pill {
		&.input-small {
			border-radius: 20px;
		}
		&.input-medium {
			border-radius: 24px;
		}
		&.input-large {
			border-radius: 28px;
		}
		&.input-jumbo {
			border-radius: 32px;
		}
	}

	.input:not(.input-pill) {
		&.input-small {
			border-radius: $corner-radius-lg;
		}
		&.input-medium {
			border-radius: $corner-radius-2xl;
		}
		&.input-large {
			border-radius: $corner-radius-2xl;
		}
		&.input-jumbo {
			border-radius: $corner-radius-2xl;
		}
	}

	// Icon adjustments
	.has-prefix-icon .input {
		padding-left: calc($unit-2x + 24px);
	}

	.has-suffix-icon .input {
		padding-right: calc($unit-2x + 24px);
	}

	.input-icon {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		align-items: center;
		justify-content: center;
		color: $gray-40;
		pointer-events: none;

		&.prefix-icon {
			left: $unit-2x;
		}

		&.suffix-icon {
			right: $unit-2x;
		}

		:global(svg) {
			width: 16px;
			height: 16px;
		}
	}

	// Footer styles
	.input-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: $unit-half;
		min-height: 20px;
	}

	.input-error,
	.input-help {
		font-size: 13px;
		line-height: 1.4;
	}

	.input-error {
		color: $red-50;
	}

	.input-help {
		color: $gray-40;
	}

	.char-count {
		font-size: 12px;
		color: $gray-50;
		font-variant-numeric: tabular-nums;
		margin-left: auto;

		&.warning {
			color: $universe-color;
		}

		&.error {
			color: $red-50;
			font-weight: 500;
		}
	}

	// Special input types
	input[type='color'].input {
		padding: $unit;
		cursor: pointer;

		&::-webkit-color-swatch-wrapper {
			padding: 0;
		}

		&::-webkit-color-swatch {
			border: none;
			border-radius: 4px;
		}
	}

	input[type='number'].input {
		-moz-appearance: textfield;

		&::-webkit-outer-spin-button,
		&::-webkit-inner-spin-button {
			-webkit-appearance: none;
			margin: 0;
		}
	}

	// Search input
	input[type='search'].input {
		&::-webkit-search-decoration,
		&::-webkit-search-cancel-button {
			-webkit-appearance: none;
		}
	}
</style>
