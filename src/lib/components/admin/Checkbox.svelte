<script lang="ts">
	interface Props {
		checked?: boolean
		size?: 'medium' | 'large'
		onchange?: (checked: boolean) => void
		disabled?: boolean
		'aria-label'?: string
	}

	let { checked = false, size = 'medium', onchange, disabled = false, 'aria-label': ariaLabel }: Props = $props()

	function handleClick() {
		if (disabled) return
		onchange?.(!checked)
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === ' ' || event.key === 'Enter') {
			event.preventDefault()
			handleClick()
		}
	}
</script>

<button
	class="checkbox {size}"
	class:checked
	class:disabled
	type="button"
	role="checkbox"
	aria-checked={checked}
	aria-label={ariaLabel}
	{disabled}
	onclick={handleClick}
	onkeydown={handleKeydown}
>
	{#if checked}
		<svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path
				d="M2.5 6L5 8.5L9.5 3.5"
				stroke="white"
				stroke-width="1.75"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	{/if}
</button>

<style lang="scss">
	.checkbox {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		border: 2px solid $gray-70;
		border-radius: $corner-radius-xs;
		background: $white;
		cursor: pointer;
		flex-shrink: 0;
		transition: all 0.15s ease;

		&.medium {
			width: 18px;
			height: 18px;

			svg {
				width: 12px;
				height: 12px;
			}
		}

		&.large {
			width: 22px;
			height: 22px;

			svg {
				width: 14px;
				height: 14px;
			}
		}

		&:hover:not(.disabled) {
			border-color: $gray-50;
		}

		&.checked {
			background: $accent-color;
			border-color: $accent-color;
		}

		&.disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}
</style>
