<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements'

	type Props = HTMLTextareaAttributes & {
		label?: string
		error?: string
		helpText?: string
		size?: 'small' | 'medium' | 'large' | 'jumbo'
		fullWidth?: boolean
		required?: boolean
		wrapperClass?: string
		textareaClass?: string
		showCharCount?: boolean
		maxLength?: number
		autoResize?: boolean
	}

	let {
		label,
		error,
		helpText,
		size = 'medium',
		fullWidth = true,
		required = false,
		wrapperClass = '',
		textareaClass = '',
		showCharCount = false,
		maxLength,
		autoResize = false,
		rows = 3,
		value = $bindable(''),
		disabled = false,
		readonly = false,
		id = `textarea-${Math.random().toString(36).substr(2, 9)}`,
		// eslint-disable-next-line svelte/valid-compile
		...restProps
	}: Props = $props()

	// Element reference for auto-resize
	let textareaElement: HTMLTextAreaElement | undefined = $state()

	// Character counting
	let charCount = $derived(String(value).length)
	let charsRemaining = $derived(maxLength ? maxLength - charCount : 0)

	// Auto-resize textarea
	$effect(() => {
		if (autoResize && textareaElement) {
			// Reset height to auto to get the correct scrollHeight
			textareaElement.style.height = 'auto'
			// Set the height to match content
			textareaElement.style.height = textareaElement.scrollHeight + 'px'
		}
	})

	// Compute wrapper classes
	function getWrapperClasses() {
		const classes = ['textarea-wrapper']
		if (fullWidth) classes.push('full-width')
		if (error) classes.push('has-error')
		if (disabled) classes.push('disabled')
		if (wrapperClass) classes.push(wrapperClass)
		return classes.join(' ')
	}

	// Compute textarea classes
	function getTextareaClasses() {
		const sizeClass = `textarea-${size}`
		const classes = ['textarea', sizeClass]
		if (textareaClass) classes.push(textareaClass)
		return classes.join(' ')
	}
</script>

<div class={getWrapperClasses()}>
	{#if label}
		<label for={id} class="textarea-label">
			{label}
			{#if required}
				<span class="required">*</span>
			{/if}
		</label>
	{/if}

	<div class="textarea-container">
		<textarea
			bind:this={textareaElement}
			bind:value
			{id}
			{disabled}
			{readonly}
			{required}
			{maxLength}
			{rows}
			class={getTextareaClasses()}
			{...restProps}
		></textarea>
	</div>

	{#if (error || helpText || showCharCount) && !disabled}
		<div class="textarea-footer">
			{#if error}
				<span class="textarea-error">{error}</span>
			{:else if helpText}
				<span class="textarea-help">{helpText}</span>
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
	.textarea-wrapper {
		display: inline-block;
		position: relative;

		&.full-width {
			display: block;
			width: 100%;
		}

		&.has-error {
			.textarea {
				border-color: $red-50;

				&:focus {
					border-color: $red-50;
				}
			}
		}

		&.disabled {
			opacity: 0.6;
		}
	}

	// Label styles
	.textarea-label {
		display: block;
		margin-bottom: $unit;
		font-size: 14px;
		font-weight: 500;
		color: $gray-20;

		.required {
			color: $red-50;
			margin-left: 2px;
		}
	}

	.textarea-container {
		position: relative;
		width: 100%;
	}

	// Textarea styles
	.textarea {
		color: $input-text-color;
		width: 100%;
		font-family: inherit;
		border: 1px solid transparent;
		border-radius: $corner-radius-sm;
		background-color: $input-background-color;
		transition: all 0.15s ease;
		resize: vertical;

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
			resize: none;
		}

		&:read-only {
			background-color: $gray-97;
			cursor: default;
			resize: none;
		}
	}

	// Size variations
	.textarea-small {
		padding: $unit calc($unit * 1.5);
		border-radius: $corner-radius-sm;
		font-size: 0.75rem;
	}

	.textarea-medium {
		padding: calc($unit * 1.5) $unit-2x;
		border-radius: $corner-radius-md;
		font-size: 1rem;
	}

	.textarea-large {
		padding: $unit-2x $unit-3x;
		border-radius: $corner-radius-lg;
		font-size: 1.25rem;
	}

	.textarea-jumbo {
		padding: $unit-2x $unit-2x;
		border-radius: $corner-radius-2xl;
		font-size: 1.33rem;
	}

	// Footer styles
	.textarea-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: $unit-half;
		min-height: 20px;
	}

	.textarea-error {
		font-size: 13px;
		color: $red-50;
		flex: 1;
	}

	.textarea-help {
		font-size: 13px;
		color: $gray-40;
		flex: 1;
	}

	.char-count {
		font-size: 12px;
		color: $gray-40;
		margin-left: $unit;

		&.warning {
			color: $yellow-50;
		}

		&.error {
			color: $red-50;
		}
	}
</style>
