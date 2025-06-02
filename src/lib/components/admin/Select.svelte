<script lang="ts">
	interface Option {
		value: string
		label: string
	}

	interface Props {
		label?: string
		value?: string
		options: Option[]
		error?: string
		helpText?: string
		required?: boolean
		disabled?: boolean
		placeholder?: string
		class?: string
	}

	let {
		label,
		value = $bindable(''),
		options,
		error,
		helpText,
		required = false,
		disabled = false,
		placeholder = 'Select an option',
		class: className = ''
	}: Props = $props()
</script>

<div class="select-wrapper {className}">
	{#if label}
		<label class="select-label">
			{label}
			{#if required}
				<span class="required">*</span>
			{/if}
		</label>
	{/if}

	<div class="select-container" class:error>
		<select
			bind:value
			{disabled}
			class="select-input"
			class:error
		>
			{#if placeholder}
				<option value="" disabled hidden>{placeholder}</option>
			{/if}
			{#each options as option}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
		<div class="select-arrow">
			<svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M6 9L12 15L18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		</div>
	</div>

	{#if error}
		<div class="error-message">{error}</div>
	{/if}

	{#if helpText && !error}
		<div class="help-text">{helpText}</div>
	{/if}
</div>

<style lang="scss">
	.select-wrapper {
		display: flex;
		flex-direction: column;
		gap: $unit-half;
		width: 100%;
	}

	.select-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: $grey-20;
		margin: 0;

		.required {
			color: $red-50;
			margin-left: 2px;
		}
	}

	.select-container {
		position: relative;
		
		&.error {
			.select-input {
				border-color: $red-50;
				box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
			}
		}
	}

	.select-input {
		width: 100%;
		padding: $unit $unit-2x;
		border: 1px solid $grey-80;
		border-radius: $corner-radius;
		background: $grey-100;
		color: $grey-10;
		font-size: 0.875rem;
		line-height: 1.5;
		appearance: none;
		cursor: pointer;
		transition: all 0.2s ease;

		&:hover:not(:disabled) {
			border-color: $grey-70;
		}

		&:focus {
			outline: none;
			border-color: $blue-50;
			box-shadow: 0 0 0 3px rgba(20, 130, 193, 0.1);
		}

		&:disabled {
			background: $grey-95;
			color: $grey-60;
			cursor: not-allowed;
		}

		&.error {
			border-color: $red-50;
		}
	}

	.select-arrow {
		position: absolute;
		right: $unit-2x;
		top: 50%;
		transform: translateY(-50%);
		color: $grey-40;
		pointer-events: none;
		transition: color 0.2s ease;
	}

	.select-container:hover .select-arrow {
		color: $grey-30;
	}

	.error-message {
		font-size: 0.75rem;
		color: $red-50;
		margin: 0;
	}

	.help-text {
		font-size: 0.75rem;
		color: $grey-40;
		margin: 0;
	}
</style>