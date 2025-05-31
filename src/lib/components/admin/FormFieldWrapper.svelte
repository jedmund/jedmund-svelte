<script lang="ts">
	interface Props {
		label: string
		required?: boolean
		helpText?: string
		error?: string
		children?: any
	}

	let { label, required = false, helpText, error, children }: Props = $props()
</script>

<div class="form-field" class:has-error={!!error}>
	<label>
		{label}
		{#if required}
			<span class="required">*</span>
		{/if}
	</label>

	{#if helpText}
		<p class="help-text">{helpText}</p>
	{/if}

	{@render children?.()}

	{#if error}
		<p class="error-text">{error}</p>
	{/if}
</div>

<style lang="scss">
	.form-field {
		margin-bottom: $unit-3x;

		&:last-child {
			margin-bottom: 0;
		}

		&.has-error {
			:global(input),
			:global(textarea) {
				border-color: #c33;
			}
		}
	}

	label {
		display: block;
		margin-bottom: $unit;
		font-weight: 500;
		color: $grey-20;
		font-size: 0.925rem;

		.required {
			color: #c33;
			margin-left: 2px;
		}
	}

	.error-text {
		margin-top: $unit;
		color: #c33;
		font-size: 0.875rem;
	}

	.help-text {
		margin-top: $unit;
		color: $grey-40;
		font-size: 0.875rem;
	}
</style>
