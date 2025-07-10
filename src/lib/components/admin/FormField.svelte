<script lang="ts">
	interface Props {
		label: string
		name?: string
		type?: string
		value?: any
		placeholder?: string
		required?: boolean
		error?: string
		helpText?: string
		disabled?: boolean
		onchange?: (e: Event) => void
		children?: any
	}

	let {
		label,
		name = '',
		type = 'text',
		value = $bindable(),
		placeholder = '',
		required = false,
		error = '',
		helpText = '',
		disabled = false,
		onchange,
		children
	}: Props = $props()

	// If children are provided, this is a wrapper mode
	const isWrapper = $derived(!!children)

	function handleChange(e: Event) {
		const target = e.target as HTMLInputElement | HTMLTextAreaElement
		value = target.value
		onchange?.(e)
	}
</script>

<div class="form-field" class:has-error={!!error}>
	<label for={!isWrapper ? name : undefined}>
		{label}
		{#if required}
			<span class="required">*</span>
		{/if}
	</label>

	{#if isWrapper}
		{@render children()}
	{:else if type === 'textarea'}
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

		&:last-child {
			margin-bottom: 0;
		}

		&.has-error {
			input,
			textarea,
			:global(input),
			:global(textarea),
			:global(select) {
				border-color: $red-error;
			}
		}
	}

	label {
		display: block;
		margin-bottom: $unit;
		font-weight: 500;
		color: $gray-20;
		font-size: 0.925rem;

		.required {
			color: $red-error;
			margin-left: 2px;
		}
	}

	input,
	textarea {
		width: 100%;
		padding: $unit-2x $unit-3x;
		border: 1px solid $gray-80;
		border-radius: $corner-radius-sm;
		font-size: 1rem;
		font-family: inherit;
		transition: border-color $transition-normal ease;
		background-color: $white;

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
		color: $red-error;
		font-size: $font-size-small;
	}

	.help-text {
		margin-top: $unit;
		color: $gray-40;
		font-size: $font-size-small;
	}
</style>
