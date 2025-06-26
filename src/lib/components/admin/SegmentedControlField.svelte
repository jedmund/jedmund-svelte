<script lang="ts">
	import FormField from './FormField.svelte'

	interface Option {
		value: string
		label: string
	}

	interface Props {
		label: string
		options: Option[]
		value?: string
		required?: boolean
		helpText?: string
		error?: string
		fullWidth?: boolean
	}

	let {
		label,
		options,
		value = $bindable(),
		required = false,
		helpText,
		error,
		fullWidth = true
	}: Props = $props()

	function handleChange(newValue: string) {
		value = newValue
	}
</script>

<FormField {label} {required} {helpText} {error}>
	{#snippet children()}
		<div class="segmented-control-wrapper" class:full-width={fullWidth}>
			<div class="segmented-control">
				{#each options as option}
					<button
						type="button"
						class="segment"
						class:active={value === option.value}
						onclick={() => handleChange(option.value)}
					>
						{option.label}
					</button>
				{/each}
			</div>
		</div>
	{/snippet}
</FormField>

<style lang="scss">
	.segmented-control-wrapper {
		&.full-width {
			width: 100%;
		}
	}

	.segmented-control {
		display: inline-flex;
		background-color: $input-background-color;
		border-radius: $corner-radius-full;
		padding: 3px;
		gap: 2px;
		width: 100%;
		// Match medium input height: padding (12px * 2) + font line-height (~20px) + padding for container (3px * 2)
		height: 50px;
		box-sizing: border-box;
	}

	.segment {
		flex: 1;
		padding: 0 $unit-2x;
		background: transparent;
		border: none;
		border-radius: $corner-radius-full;
		font-size: 1rem;
		font-weight: 500;
		color: $input-text-color;
		cursor: pointer;
		transition: all 0.15s ease;
		white-space: nowrap;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;

		&:hover:not(.active) {
			color: $input-text-color-hover;
			background-color: rgba(0, 0, 0, 0.03);
		}

		&.active {
			background-color: white;
			color: $gray-10;
			box-shadow:
				0 1px 3px rgba(0, 0, 0, 0.08),
				0 1px 2px rgba(0, 0, 0, 0.04);
		}

		&:focus {
			outline: none;
		}

		&:focus-visible {
			box-shadow: 0 0 0 2px $primary-color;
		}
	}
</style>
