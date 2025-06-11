<script lang="ts">
	import Select from './Select.svelte'
	import FormFieldWrapper from './FormFieldWrapper.svelte'
	import type { HTMLSelectAttributes } from 'svelte/elements'

	interface Option {
		value: string
		label: string
	}

	interface Props extends Omit<HTMLSelectAttributes, 'size'> {
		label: string
		options: Option[]
		value?: string
		size?: 'small' | 'medium' | 'large'
		variant?: 'default' | 'minimal'
		fullWidth?: boolean
		pill?: boolean
		required?: boolean
		helpText?: string
		error?: string
	}

	let {
		label,
		options,
		value = $bindable(),
		size = 'medium',
		variant = 'default',
		fullWidth = true,
		pill = true,
		required = false,
		helpText,
		error,
		...restProps
	}: Props = $props()
</script>

<FormFieldWrapper {label} {required} {helpText} {error}>
	{#snippet children()}
		<Select bind:value {options} {size} {variant} {fullWidth} {pill} {...restProps} />
	{/snippet}
</FormFieldWrapper>

<style lang="scss">
	// Ensure proper spacing for select fields
	:global(.form-field) {
		:global(.select-wrapper) {
			margin-top: 0;
		}
	}
</style>
