<script lang="ts">
	interface Props {
		checked: boolean
		disabled?: boolean
		accentColor?: string
		onchange?: (checked: boolean) => void
	}

	let { checked = $bindable(), disabled = false, accentColor, onchange }: Props = $props()

	function handleChange(e: Event) {
		const target = e.target as HTMLInputElement
		checked = target.checked
		if (onchange) {
			onchange(checked)
		}
	}
</script>

<label class="switch" style:--switch-accent={accentColor}>
	<input
		type="checkbox"
		bind:checked
		{disabled}
		onchange={handleChange}
		class="switch__input"
	/>
	<span class="switch__slider"></span>
</label>

<style lang="scss">
	.switch {
		display: flex;
		align-items: center;
		cursor: pointer;
		user-select: none;
	}

	.switch__input {
		position: absolute;
		opacity: 0;
		pointer-events: none;

		&:checked + .switch__slider {
			background-color: var(--switch-accent, $red-60);

			&::before {
				transform: translateX(20px);
			}
		}

		&:disabled + .switch__slider {
			opacity: 0.6;
			cursor: not-allowed;
		}
	}

	.switch__slider {
		position: relative;
		width: 44px;
		height: 24px;
		background-color: $gray-80;
		border-radius: 12px;
		transition: background-color 0.2s ease;
		flex-shrink: 0;

		&::before {
			content: '';
			position: absolute;
			top: 2px;
			left: 2px;
			width: 20px;
			height: 20px;
			background-color: white;
			border-radius: 50%;
			transition: transform 0.2s ease;
			box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		}
	}
</style>
