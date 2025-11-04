<script lang="ts">
	import { clickOutside } from '$lib/actions/clickOutside'
	import DropdownItem from './DropdownItem.svelte'
	import DropdownMenuContainer from './DropdownMenuContainer.svelte'
	import FormField from './FormField.svelte'

	interface Option {
		value: string
		label: string
		description?: string
	}

	interface Props {
		label: string
		value?: string
		options: Option[]
		required?: boolean
		helpText?: string
		error?: string
		disabled?: boolean
		placeholder?: string
	}

	let {
		label,
		value = $bindable(),
		options,
		required = false,
		helpText,
		error,
		disabled = false,
		placeholder = 'Select an option'
	}: Props = $props()

	let isOpen = $state(false)

	const selectedOption = $derived(options.find((opt) => opt.value === value))

	function handleSelect(optionValue: string) {
		value = optionValue
		isOpen = false
	}

	function handleClickOutside() {
		isOpen = false
	}
</script>

<FormField {label} {required} {helpText} {error}>
	{#snippet children()}
		<div
			class="dropdown-select"
			use:clickOutside={{ enabled: isOpen }}
			onclickoutside={handleClickOutside}
		>
			<button
				type="button"
				class="dropdown-select-trigger"
				class:open={isOpen}
				class:has-value={!!value}
				class:disabled
				{disabled}
				onclick={() => !disabled && (isOpen = !isOpen)}
			>
				<span class="dropdown-select-value">
					{selectedOption?.label || placeholder}
				</span>
				<svg
					class="chevron"
					class:rotate={isOpen}
					width="12"
					height="12"
					viewBox="0 0 12 12"
					fill="none"
				>
					<path
						d="M3 4.5L6 7.5L9 4.5"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</button>

			{#if isOpen}
				<DropdownMenuContainer>
					{#each options as option}
						<DropdownItem
							label={option.label}
							description={option.description}
							onclick={() => handleSelect(option.value)}
						/>
					{/each}
				</DropdownMenuContainer>
			{/if}
		</div>
	{/snippet}
</FormField>

<style lang="scss">
	.dropdown-select {
		position: relative;
		width: 100%;
	}

	.dropdown-select-trigger {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: $unit-2x $unit-3x;
		background: $input-bg;
		border: 1px solid $input-border;
		border-radius: $corner-radius-full;
		font-size: 0.9375rem;
		color: $input-text;
		cursor: pointer;
		transition: all 0.2s ease;

		&:hover:not(.disabled) {
			background: $input-bg-hover;
			border-color: $gray-70;
		}

		&.open,
		&:focus {
			background: $input-bg-focus;
			border-color: $input-border-focus;
			outline: none;
		}

		&.disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}

		&:not(.has-value) {
			.dropdown-select-value {
				color: $gray-40;
			}
		}
	}

	.dropdown-select-value {
		flex: 1;
		text-align: left;
	}

	.chevron {
		flex-shrink: 0;
		color: $gray-40;
		transition: transform 0.2s ease;

		&.rotate {
			transform: rotate(180deg);
		}
	}
</style>
