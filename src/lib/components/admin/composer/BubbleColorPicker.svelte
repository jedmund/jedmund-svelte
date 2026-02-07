<script lang="ts">
	import type { Editor } from '@tiptap/core'
	import ColorPicker, { ChromeVariant } from 'svelte-awesome-color-picker'
	import { clickOutside } from '$lib/actions/clickOutside'

	interface Props {
		editor: Editor
		isOpen: boolean
		onClose: () => void
		mode: 'text' | 'highlight'
		currentColor?: string
	}

	const { editor, isOpen, onClose, mode, currentColor = '#000000' }: Props = $props()

	let color = $state(currentColor)
	let showPicker = $state(false)

	// Preset colors - different sets for text and highlight
	const textPresetColors = [
		'#000000', // Black
		'#4D4D4D', // Gray
		'#999999', // Light Gray
		'#F44336', // Red
		'#E91E63', // Pink
		'#9C27B0', // Purple
		'#673AB7', // Deep Purple
		'#3F51B5', // Indigo
		'#2196F3', // Blue
		'#03A9F4', // Light Blue
		'#00BCD4', // Cyan
		'#009688', // Teal
		'#4CAF50', // Green
		'#8BC34A', // Light Green
		'#CDDC39', // Lime
		'#FFEB3B', // Yellow
		'#FFC107', // Amber
		'#FF9800', // Orange
		'#FF5722', // Deep Orange
		'#795548' // Brown
	]

	// Lighter, pastel colors for highlighting
	const highlightPresetColors = [
		'#FFF3E0', // Pale Orange
		'#FFEBEE', // Pale Red
		'#FCE4EC', // Pale Pink
		'#F3E5F5', // Pale Purple
		'#EDE7F6', // Pale Deep Purple
		'#E8EAF6', // Pale Indigo
		'#E3F2FD', // Pale Blue
		'#E1F5FE', // Pale Light Blue
		'#E0F7FA', // Pale Cyan
		'#E0F2F1', // Pale Teal
		'#E8F5E9', // Pale Green
		'#F1F8E9', // Pale Light Green
		'#F9FBE7', // Pale Lime
		'#FFFDE7', // Pale Yellow
		'#FFF8E1', // Pale Amber
		'#FFECB3', // Light Amber
		'#FFE0B2', // Light Orange
		'#FFCCBC', // Light Deep Orange
		'#D7CCC8', // Light Brown
		'#F5F5F5' // Light Gray
	]

	const presetColors = $derived(mode === 'text' ? textPresetColors : highlightPresetColors)

	$effect(() => {
		// Update local color when currentColor prop changes
		color = currentColor || (mode === 'text' ? '#000000' : '#FFEB3B')
	})

	function applyColor(selectedColor: string) {
		if (mode === 'text') {
			editor.chain().focus().setColor(selectedColor).run()
		} else {
			editor.chain().focus().setHighlight({ color: selectedColor }).run()
		}
		color = selectedColor
	}

	function removeColor() {
		if (mode === 'text') {
			editor.chain().focus().unsetColor().run()
		} else {
			editor.chain().focus().unsetHighlight().run()
		}
		onClose()
	}

	function handlePresetClick(presetColor: string) {
		applyColor(presetColor)
		onClose()
	}

	function handleCustomColor() {
		applyColor(color)
		onClose()
	}
</script>

{#if isOpen}
	<div class="bubble-color-picker" use:clickOutside onclickoutside={onClose}>
		<div class="color-picker-header">
			<span>{mode === 'text' ? 'Text Color' : 'Highlight Color'}</span>
			<button class="remove-color-btn" onclick={removeColor}> Remove </button>
		</div>

		<div class="preset-colors">
			{#each presetColors as presetColor}
				<button
					class="color-preset"
					style="background-color: {presetColor}"
					onclick={() => handlePresetClick(presetColor)}
					title={presetColor}
				></button>
			{/each}
		</div>

		<div class="custom-color-section">
			{#if !showPicker}
				<button class="custom-color-btn" onclick={() => (showPicker = true)}>
					Custom color...
				</button>
			{:else}
				<div class="custom-picker">
					<ColorPicker
						bind:hex={color}
						components={ChromeVariant}
						sliderDirection="horizontal"
						isAlpha={false}
					/>
					<button class="apply-custom-btn" onclick={handleCustomColor}> Apply </button>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style lang="scss">
	@import '$styles/variables';
	@import '$styles/mixins';

	.bubble-color-picker {
		position: absolute;
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		margin-top: 4px;
		z-index: 50;
		background: rgba($white, 0.98);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid rgba($gray-85, 0.3);
		border-radius: $corner-radius-md;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
		padding: 12px;
		width: 260px;
		animation: dropdownFadeIn 0.15s ease-out;
	}

	@keyframes dropdownFadeIn {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.color-picker-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12px;
		padding-bottom: 8px;
		border-bottom: 1px solid rgba($gray-85, 0.3);

		span {
			font-size: 13px;
			font-weight: 500;
			color: $gray-10;
		}
	}

	.remove-color-btn {
		padding: 4px 8px;
		background: transparent;
		border: none;
		border-radius: $corner-radius-sm;
		font-size: 12px;
		color: $gray-30;
		cursor: pointer;
		transition: all 0.15s ease;

		&:hover {
			background: rgba($gray-90, 0.5);
			color: $gray-20;
		}
	}

	.preset-colors {
		display: grid;
		grid-template-columns: repeat(5, 40px);
		grid-auto-rows: 40px;
		gap: 8px;
		justify-content: center;
		margin-bottom: 12px;
	}

	.color-preset {
		width: 40px;
		height: 40px;
		border: none;
		border-radius: 50%;
		cursor: pointer;
		transition: all 0.15s ease;
		position: relative;

		&:hover {
			transform: scale(1.15);
		}

		&:active {
			transform: scale(0.95);
		}
	}

	.custom-color-section {
		border-top: 1px solid rgba($gray-85, 0.3);
		padding-top: 12px;
	}

	.custom-color-btn {
		width: 100%;
		padding: 8px 12px;
		background: transparent;
		border: 1px solid rgba($gray-85, 0.3);
		border-radius: $corner-radius-sm;
		font-size: 13px;
		color: $gray-20;
		cursor: pointer;
		transition: all 0.15s ease;

		&:hover {
			background: rgba($gray-90, 0.5);
			border-color: rgba($gray-80, 0.5);
		}
	}

	.custom-picker {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.apply-custom-btn {
		padding: 8px 16px;
		background: $blue-50;
		border: none;
		border-radius: $corner-radius-sm;
		font-size: 13px;
		font-weight: 500;
		color: $white;
		cursor: pointer;
		transition: all 0.15s ease;

		&:hover {
			background: $blue-40;
			transform: translateY(-1px);
		}

		&:active {
			transform: translateY(0);
		}
	}

	// Override svelte-awesome-color-picker styles
	:global(.bubble-color-picker .color-picker) {
		--picker-height: 150px !important;
		--picker-width: 100% !important;
		margin-bottom: 8px;
	}

	:global(.bubble-color-picker .picker) {
		width: 100% !important;
		height: 150px !important;
		margin-bottom: 8px;
		border-radius: $corner-radius-sm;
		border: 1px solid rgba($gray-85, 0.3);
	}

	:global(.bubble-color-picker .chrome-picker) {
		width: 100%;
		padding: 0;
		border: none;
		background: transparent;
	}

	:global(.bubble-color-picker .slider) {
		margin-top: 8px;
		height: 12px !important;
		border-radius: 6px;
	}

	:global(.bubble-color-picker .color-button) {
		display: none !important;
	}

	:global(.bubble-color-picker .input) {
		margin-top: 8px;
	}

	:global(.bubble-color-picker .input input) {
		width: 100%;
		padding: 6px 10px;
		background: rgba($gray-95, 0.5);
		border: 1px solid rgba($gray-85, 0.3);
		border-radius: $corner-radius-sm;
		font-size: 13px;
		color: $gray-10;
		text-align: center;
		font-family: monospace;
	}

	:global(.bubble-color-picker .input input:focus) {
		background: rgba($gray-90, 0.5);
		border-color: rgba($blue-50, 0.5);
		outline: none;
	}
</style>
