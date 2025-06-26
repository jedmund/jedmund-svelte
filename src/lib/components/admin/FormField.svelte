<script lang="ts">
	interface Props {
		label: string
		name: string
		type?: string
		value?: any
		placeholder?: string
		required?: boolean
		error?: string
		helpText?: string
		disabled?: boolean
		onchange?: (e: Event) => void
	}

	let {
		label,
		name,
		type = 'text',
		value = $bindable(),
		placeholder = '',
		required = false,
		error = '',
		helpText = '',
		disabled = false,
		onchange
	}: Props = $props()

	function handleChange(e: Event) {
		const target = e.target as HTMLInputElement | HTMLTextAreaElement
		value = target.value
		onchange?.(e)
	}
</script>

<div class="form-field" class:has-error={!!error}>
	<label for={name}>
		{label}
		{#if required}
			<span class="required">*</span>
		{/if}
	</label>

	{#if type === 'textarea'}
		<textarea
			id={name}
			{name}
			{value}
			{placeholder}
			{required}
			{disabled}
			onchange={handleChange}
			rows="4"
		/>
	{:else}
		<input
			id={name}
			{name}
			{type}
			{value}
			{placeholder}
			{required}
			{disabled}
			onchange={handleChange}
		/>
	{/if}

	{#if error}
		<div class="error-text">{error}</div>
	{:else if helpText}
		<div class="help-text">{helpText}</div>
	{/if}
</div>

<style lang="scss">
	.form-field {
		margin-bottom: $unit-4x;

		&.has-error {
			input,
			textarea {
				border-color: #c33;
			}
		}
	}

	label {
		display: block;
		margin-bottom: $unit;
		font-weight: 500;
		color: $gray-20;

		.required {
			color: #c33;
			margin-left: 2px;
		}
	}

	input,
	textarea {
		width: 100%;
		padding: $unit-2x $unit-3x;
		border: 1px solid $gray-80;
		border-radius: 6px;
		font-size: 1rem;
		font-family: inherit;
		transition: border-color 0.2s ease;
		background-color: white;

		&:focus {
			outline: none;
			border-color: $primary-color;
		}

		&:disabled {
			background-color: $gray-95;
			cursor: not-allowed;
		}
	}

	textarea {
		resize: vertical;
		min-height: 100px;
	}

	.error-text {
		margin-top: $unit;
		color: #c33;
		font-size: 0.875rem;
	}

	.help-text {
		margin-top: $unit;
		color: $gray-40;
		font-size: 0.875rem;
	}
</style>
