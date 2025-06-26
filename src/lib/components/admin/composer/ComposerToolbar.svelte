<script lang="ts">
	import type { Editor } from '@tiptap/core'
	import EdraToolBarIcon from '$lib/components/edra/headless/components/EdraToolBarIcon.svelte'
	import type { ComposerVariant } from './types'

	interface Props {
		editor: Editor
		variant: ComposerVariant
		currentTextStyle: string
		filteredCommands: any
		colorCommands: any[]
		excludedCommands: string[]
		showMediaLibrary: boolean
		onTextStyleDropdownToggle: () => void
		onMediaDropdownToggle: () => void
	}

	let {
		editor,
		variant,
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
				<EdraToolBarIcon {command} {editor} />
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
			<EdraToolBarIcon
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
			<EdraToolBarIcon
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

<style lang="scss">
	@import '$styles/variables';
	@import '$styles/mixins';

	.editor-toolbar {
		border-bottom: 1px solid $gray-90;
		background: $white;
		position: sticky;
		top: 0;
		z-index: 10;
		padding: $unit 0;
	}

	.edra-toolbar {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 0 $unit-6x;
		flex-wrap: wrap;
		
		@include breakpoint('phone') {
			padding: 0 $unit-4x;
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
		padding: 6px 10px;
		background: transparent;
		border: 1px solid transparent;
		border-radius: $corner-radius;
		font-size: 14px;
		color: $gray-10;
		cursor: pointer;
		transition: all 0.2s ease;

		&:hover {
			background: $gray-95;
			border-color: $gray-85;
		}

		&:active {
			background: $gray-90;
		}

		svg {
			width: 12px;
			height: 12px;
			opacity: 0.5;
		}
	}

	.separator {
		width: 1px;
		height: 20px;
		background: $gray-85;
		margin: 0 4px;
	}
</style>