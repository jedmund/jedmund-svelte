<script lang="ts">
	import type { Editor } from '@tiptap/core'
	import ToolBarIcon from '$lib/components/edra/headless/components/ToolBarIcon.svelte'
	import type { ComposerVariant } from './types'
	import type { FilteredCommands } from './editorConfig'
	import type { EdraCommand } from '$lib/components/edra/commands/types'

	interface Props {
		editor: Editor
		variant: ComposerVariant
		currentTextStyle: string
		filteredCommands: FilteredCommands
		colorCommands: EdraCommand[]
		excludedCommands: string[]
		showMediaLibrary: boolean
		onTextStyleDropdownToggle: () => void
		onMediaDropdownToggle: () => void
	}

	let {
		editor,
		currentTextStyle,
		filteredCommands,
		colorCommands,
		excludedCommands,
		showMediaLibrary,
		onTextStyleDropdownToggle,
		onMediaDropdownToggle
	}: Props = $props()

	let dropdownTriggerRef = $state<HTMLElement>()
	let mediaDropdownTriggerRef = $state<HTMLElement>()

	// Export refs for parent component positioning
	export function getDropdownRefs() {
		return {
			textStyle: dropdownTriggerRef,
			media: mediaDropdownTriggerRef
		}
	}
</script>

<div class="editor-toolbar">
	<div class="toolbar-container">
		<div class="edra-toolbar">
			<!-- Text Style Dropdown -->
			<div class="text-style-dropdown">
				<button
					bind:this={dropdownTriggerRef}
					class="dropdown-trigger"
					onclick={onTextStyleDropdownToggle}
				>
					<span>{currentTextStyle}</span>
					<svg
						width="12"
						height="12"
						viewBox="0 0 12 12"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M3 4.5L6 7.5L9 4.5"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</button>
			</div>

			<span class="separator"></span>

			{#each Object.keys(filteredCommands).filter((key) => !excludedCommands.includes(key)) as keys}
				{@const groups = filteredCommands[keys].commands}
				{#each groups as command}
					<ToolBarIcon {command} {editor} />
				{/each}
				<span class="separator"></span>
			{/each}

			{#if showMediaLibrary}
				<!-- Media Dropdown -->
				<div class="text-style-dropdown">
					<button
						bind:this={mediaDropdownTriggerRef}
						class="dropdown-trigger"
						onclick={onMediaDropdownToggle}
					>
						<span>Insert</span>
						<svg
							width="12"
							height="12"
							viewBox="0 0 12 12"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								d="M3 4.5L6 7.5L9 4.5"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</button>
				</div>

				<span class="separator"></span>
			{/if}

			{#if colorCommands.length > 0}
				<ToolBarIcon
					command={colorCommands[0]}
					{editor}
					style={`color: ${editor.getAttributes('textStyle').color};`}
					onclick={() => {
						const color = editor.getAttributes('textStyle').color
						const hasColor = editor.isActive('textStyle', { color })
						if (hasColor) {
							editor.chain().focus().unsetColor().run()
						} else {
							const color = prompt('Enter the color of the text:')
							if (color !== null) {
								editor.chain().focus().setColor(color).run()
							}
						}
					}}
				/>
				<ToolBarIcon
					command={colorCommands[1]}
					{editor}
					style={`background-color: ${editor.getAttributes('highlight').color};`}
					onclick={() => {
						const hasHightlight = editor.isActive('highlight')
						if (hasHightlight) {
							editor.chain().focus().unsetHighlight().run()
						} else {
							const color = prompt('Enter the color of the highlight:')
							if (color !== null) {
								editor.chain().focus().setHighlight({ color }).run()
							}
						}
					}}
				/>
			{/if}
		</div>
	</div>
</div>

<style lang="scss">
	@import '$styles/variables';
	@import '$styles/mixins';

	.editor-toolbar {
		position: sticky;
		top: $unit;
		z-index: 20;
		padding: $unit $unit-2x;
		margin: 0 0 $unit-2x 0;
		background: rgba($white, 0.98);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid rgba($gray-90, 0.2);
		border-radius: $corner-radius-md;
		box-shadow: none;
		transition: all 0.2s ease;
		animation: slideDown 0.3s ease-out;

		&:hover {
			background: $white;
			border-color: rgba($gray-85, 0.3);
			box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
		}
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.toolbar-container {
		max-width: $page-width;
		margin: 0 auto;
		padding: 0 $unit-2x;

		@include breakpoint('phone') {
			padding: 0;
		}
	}

	.edra-toolbar {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 0 $unit-6x;
		flex-wrap: wrap;
		height: 44px;

		@include breakpoint('phone') {
			padding: 0 $unit-4x;
			gap: 4px;
		}
	}

	.text-style-dropdown {
		display: flex;
		align-items: center;
	}

	.dropdown-trigger {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 6px 12px;
		background: rgba($gray-95, 0.5);
		border: 1px solid rgba($gray-85, 0.3);
		border-radius: $corner-radius;
		font-size: 13px;
		font-weight: 500;
		color: $gray-10;
		cursor: pointer;
		transition: all 0.15s ease;
		height: 32px;

		&:hover {
			background: rgba($gray-90, 0.8);
			border-color: rgba($gray-80, 0.5);
			transform: translateY(-1px);
			box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
		}

		&:active {
			background: rgba($gray-85, 0.9);
			transform: translateY(0);
			box-shadow: none;
		}

		svg {
			width: 10px;
			height: 10px;
			opacity: 0.6;
		}
	}

	.separator {
		width: 1px;
		height: 24px;
		background: rgba($gray-85, 0.3);
		margin: 0 6px;
		opacity: 0.6;
	}

	// Override edra toolbar icon styles for floating appearance
	:global(.editor-toolbar .edra-command-button) {
		min-width: 32px;
		min-height: 32px;
		background-color: transparent;
		border-radius: $corner-radius;
		transition: all 0.15s ease;

		&:hover {
			background-color: rgba($gray-85, 0.6);
			transform: translateY(-1px);
		}

		&:active {
			background-color: rgba($gray-85, 0.7);
			transform: translateY(0);
		}
	}

	:global(.editor-toolbar .edra-command-button.active) {
		background-color: rgba($blue-50, 0.1);
		color: $blue-40;
	}

	:global(.editor-toolbar .edra-command-button.active:hover) {
		background-color: rgba($blue-50, 0.15);
	}

	:global(.editor-toolbar .edra-toolbar-icon) {
		width: 16px;
		height: 16px;
		stroke-width: 2px;
	}
</style>
