<script lang="ts">
	import type { HTMLInputAttributes, HTMLTextareaAttributes } from 'svelte/elements'

	// Type helpers for different input elements
	type InputProps = HTMLInputAttributes & {
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
	}

	type TextareaProps = HTMLTextareaAttributes & {
		type: 'textarea'
		rows?: number
		autoResize?: boolean
	}

	type Props = (InputProps | TextareaProps) & {
		label?: string
		error?: string
		helpText?: string
		size?: 'small' | 'medium' | 'large'
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

	// For textarea auto-resize
	let textareaElement: HTMLTextAreaElement | undefined = $state()
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

	// Auto-resize textarea
	$effect(() => {
		if (type === 'textarea' && textareaElement && isTextarea(restProps) && restProps.autoResize) {
			// Reset height to auto to get the correct scrollHeight
			textareaElement.style.height = 'auto'
			// Set the height to match content
			textareaElement.style.height = textareaElement.scrollHeight + 'px'
		}
	})

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
		if (type === 'textarea' && isTextarea(restProps) && restProps.autoResize)
			classes.push('has-auto-resize')
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

	// Type guard for textarea props
	function isTextarea(props: Props): props is TextareaProps {
		return props.type === 'textarea'
	}
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

		{#if type === 'textarea' && isTextarea(restProps)}
			<textarea
				bind:this={textareaElement}
				bind:value
				{id}
				{disabled}
				{readonly}
				{required}
				{maxLength}
				class={inputClasses()}
				rows={restProps.rows || 3}
				{...restProps}
			/>
		{:else}
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
		{/if}

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
		color: $grey-20;
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

	// Input and textarea styles
	.input {
		width: 100%;
		font-size: 14px;
		border: 1px solid $grey-80;
		border-radius: 6px;
		background-color: white;
		transition: all 0.15s ease;

		&::placeholder {
			color: $grey-50;
		}

		&:focus {
			outline: none;
			border-color: $primary-color;
			background-color: white;
		}

		&:disabled {
			background-color: $grey-95;
			cursor: not-allowed;
			color: $grey-40;
		}

		&:read-only {
			background-color: $grey-97;
			cursor: default;
		}
	}

	// Size variations
	.input-small {
		padding: $unit calc($unit * 1.5);
		font-size: 13px;
	}

	.input-medium {
		padding: calc($unit * 1.5) $unit-2x;
		font-size: 14px;
	}

	.input-large {
		padding: $unit-2x $unit-3x;
		font-size: 16px;
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
	}

	.input:not(.input-pill) {
		&.input-small {
			border-radius: 6px;
		}
		&.input-medium {
			border-radius: 8px;
		}
		&.input-large {
			border-radius: 10px;
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
		color: $grey-40;
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

	// Textarea specific
	textarea.input {
		resize: vertical;
		min-height: 80px;
		padding-top: calc($unit * 1.5);
		padding-bottom: calc($unit * 1.5);
		line-height: 1.5;
		overflow-y: hidden; // Important for auto-resize

		&.input-small {
			min-height: 60px;
			padding-top: $unit;
			padding-bottom: $unit;
		}

		&.input-large {
			min-height: 100px;
		}
	}

	// Auto-resizing textarea
	.has-auto-resize textarea.input {
		resize: none; // Disable manual resize when auto-resize is enabled
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
		color: $grey-40;
	}

	.char-count {
		font-size: 12px;
		color: $grey-50;
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
