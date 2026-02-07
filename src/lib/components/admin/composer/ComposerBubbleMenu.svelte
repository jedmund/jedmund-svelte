<script lang="ts">
	import { BubbleMenu } from 'svelte-tiptap'
	import { isTextSelection, type Editor } from '@tiptap/core'
	import type { ShouldShowProps } from '$lib/components/edra/utils'
	import EdraToolBarIcon from '$lib/components/edra/headless/components/EdraToolBarIcon.svelte'
	import type { ComposerFeatures } from './types'
	import { getBubbleMenuCommands, getCurrentTextStyle } from './editorConfig'
	import Link from '@lucide/svelte/icons/link'
	import Check from '@lucide/svelte/icons/check'
	import X from '@lucide/svelte/icons/x'
	import ChevronDown from '@lucide/svelte/icons/chevron-down'
	import Type from '@lucide/svelte/icons/type'
	import Palette from '@lucide/svelte/icons/palette'
	import Highlighter from '@lucide/svelte/icons/highlighter'
	import BubbleTextStyleMenu from './BubbleTextStyleMenu.svelte'
	import BubbleColorPicker from './BubbleColorPicker.svelte'

	interface Props {
		editor: Editor
		features: ComposerFeatures
	}

	const { editor, features }: Props = $props()

	let isLinkMode = $state(false)
	let linkInput = $state('')
	let linkInputElement = $state<HTMLInputElement>()
	let showTextStyleMenu = $state(false)
	let showColorPicker = $state(false)
	let showHighlightPicker = $state(false)
	let textStyleButtonRef = $state<HTMLElement>()
	let colorButtonRef = $state<HTMLElement>()
	let highlightButtonRef = $state<HTMLElement>()

	// Get commands for bubble menu
	const bubbleMenuCommands = getBubbleMenuCommands()

	// Filter out link command as we'll handle it specially
	const formattingCommands = bubbleMenuCommands.filter((cmd) => cmd.name !== 'link')

	// Get current text style
	const currentTextStyle = $derived(editor ? getCurrentTextStyle(editor) : 'Paragraph')

	function shouldShow(props: ShouldShowProps) {
		const { editor, state } = props
		const { selection } = state
		const { empty, from, to } = selection

		// Don't show if not editable
		if (!editor.isEditable) return false

		// Don't show if selection is empty
		if (empty) return false

		// Don't show if selection is not text
		if (!isTextSelection(selection)) return false

		// Don't show in code blocks
		if (editor.isActive('codeBlock')) return false

		// Don't show if we're in a table (has its own menus)
		if (editor.isActive('table')) return false

		// Don't show if link menu is already showing
		if (editor.isActive('link') && !isLinkMode) return false

		// Check if selection contains only whitespace
		const text = state.doc.textBetween(from, to)
		if (!text.trim()) return false

		return true
	}

	function handleLinkClick() {
		if (editor.isActive('link')) {
			// If already a link, remove it
			editor.chain().focus().unsetLink().run()
		} else {
			// Enter link mode
			isLinkMode = true
			linkInput = ''
			// Focus input after render
			setTimeout(() => linkInputElement?.focus(), 0)
		}
	}

	function applyLink() {
		if (linkInput.trim()) {
			let href = linkInput.trim()
			// Add protocol if missing
			if (!/^https?:\/\//i.test(href)) {
				href = 'https://' + href
			}
			editor.chain().focus().setLink({ href, target: '_blank' }).run()
		}
		cancelLinkMode()
	}

	function cancelLinkMode() {
		isLinkMode = false
		linkInput = ''
		editor.commands.focus()
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault()
			applyLink()
		} else if (e.key === 'Escape') {
			e.preventDefault()
			cancelLinkMode()
		}
	}

	// Close all menus when bubble menu hides
	$effect(() => {
		return () => {
			showTextStyleMenu = false
			showColorPicker = false
			showHighlightPicker = false
		}
	})
</script>

<BubbleMenu
	{editor}
	class="composer-bubble-menu"
	{shouldShow}
	pluginKey="composer-bubble-menu"
	updateDelay={100}
	tippyOptions={{
		popperOptions: {
			placement: 'top',
			modifiers: [
				{
					name: 'preventOverflow',
					options: {
						boundary: 'viewport',
						padding: 8
					}
				},
				{
					name: 'flip',
					options: {
						fallbackPlacements: ['bottom', 'top-start', 'top-end', 'bottom-start', 'bottom-end']
					}
				}
			]
		},
		maxWidth: 'calc(100vw - 16px)',
		duration: [200, 150],
		animation: 'fade'
	}}
>
	<div class="bubble-menu-content">
		{#if isLinkMode}
			<div class="link-input-container">
				<input
					bind:this={linkInputElement}
					bind:value={linkInput}
					type="url"
					placeholder="Enter URL..."
					class="link-input"
					onkeydown={handleKeydown}
				/>
				<button
					class="bubble-menu-button"
					onclick={applyLink}
					disabled={!linkInput.trim()}
					title="Apply link"
				>
					<Check size={16} />
				</button>
				<button class="bubble-menu-button" onclick={cancelLinkMode} title="Cancel">
					<X size={16} />
				</button>
			</div>
		{:else}
			<div class="formatting-buttons">
				<!-- Block type indicator -->
				<div class="dropdown-wrapper">
					<button
						bind:this={textStyleButtonRef}
						class="bubble-menu-button text-style-button"
						onclick={() => {
							showTextStyleMenu = !showTextStyleMenu
							showColorPicker = false
							showHighlightPicker = false
						}}
						title="Text style"
					>
						<Type size={16} />
						<span class="text-style-label">{currentTextStyle}</span>
						<ChevronDown size={12} />
					</button>

					<!-- Text Style Dropdown -->
					<BubbleTextStyleMenu
						{editor}
						isOpen={showTextStyleMenu}
						onClose={() => (showTextStyleMenu = false)}
						features={{ ...features }}
					/>
				</div>

				<span class="separator"></span>

				{#each formattingCommands as command}
					<EdraToolBarIcon {command} {editor} />
				{/each}

				<button
					class="bubble-menu-button"
					class:active={editor.isActive('link')}
					onclick={handleLinkClick}
					title="Link (Cmd/Ctrl+K)"
				>
					<Link size={16} />
				</button>

				<span class="separator"></span>

				<!-- Color options -->
				<div class="dropdown-wrapper">
					<button
						bind:this={colorButtonRef}
						class="bubble-menu-button"
						onclick={() => {
							showColorPicker = !showColorPicker
							showTextStyleMenu = false
							showHighlightPicker = false
						}}
						title="Text color"
						style={editor.getAttributes('textStyle').color
							? `color: ${editor.getAttributes('textStyle').color}`
							: ''}
					>
						<Palette size={16} />
					</button>

					<!-- Text Color Picker -->
					<BubbleColorPicker
						{editor}
						isOpen={showColorPicker}
						onClose={() => (showColorPicker = false)}
						mode="text"
						currentColor={editor.getAttributes('textStyle').color}
					/>
				</div>

				<div class="dropdown-wrapper">
					<button
						bind:this={highlightButtonRef}
						class="bubble-menu-button"
						onclick={() => {
							showHighlightPicker = !showHighlightPicker
							showTextStyleMenu = false
							showColorPicker = false
						}}
						title="Highlight color"
						style={editor.getAttributes('highlight').color
							? `background-color: ${editor.getAttributes('highlight').color}`
							: ''}
					>
						<Highlighter size={16} />
					</button>

					<!-- Highlight Color Picker -->
					<BubbleColorPicker
						{editor}
						isOpen={showHighlightPicker}
						onClose={() => (showHighlightPicker = false)}
						mode="highlight"
						currentColor={editor.getAttributes('highlight').color}
					/>
				</div>
			</div>
		{/if}
	</div>
</BubbleMenu>

<style lang="scss">
	@import '$styles/variables';
	@import '$styles/mixins';

	:global(.composer-bubble-menu) {
		z-index: 30;
	}

	.bubble-menu-content {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 6px;
		background: rgba($white, 0.95);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid rgba($gray-85, 0.5);
		border-radius: $corner-radius;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
		animation: bubbleMenuFadeIn 0.2s ease-out;
	}

	@keyframes bubbleMenuFadeIn {
		from {
			opacity: 0;
			transform: scale(0.95) translateY(4px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	.formatting-buttons {
		display: flex;
		align-items: center;
		gap: 2px;
	}

	.bubble-menu-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 32px;
		height: 32px;
		padding: 0 6px;
		background: transparent;
		border: none;
		border-radius: $corner-radius-sm;
		color: $gray-20;
		cursor: pointer;
		transition: all 0.15s ease;
		gap: 4px;

		&:hover {
			background: rgba($gray-85, 0.6);
			transform: translateY(-1px);
		}

		&:active {
			background: rgba($gray-85, 0.7);
			transform: translateY(0);
		}

		&.active {
			background: rgba($blue-50, 0.1);
			color: $blue-40;
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}

		&.text-style-button {
			min-width: auto;
			padding: 0 8px;
		}
	}

	.text-style-label {
		font-size: 12px;
		font-weight: 500;
		white-space: nowrap;
	}

	.separator {
		width: 1px;
		height: 20px;
		background: rgba($gray-85, 0.3);
		margin: 0 2px;
	}

	.dropdown-wrapper {
		position: relative;
		display: inline-flex;
	}

	.link-input-container {
		display: flex;
		align-items: center;
		gap: 4px;
		min-width: 250px;
	}

	.link-input {
		flex: 1;
		padding: 6px 10px;
		background: rgba($gray-95, 0.5);
		border: 1px solid rgba($gray-85, 0.3);
		border-radius: $corner-radius-sm;
		font-size: 13px;
		color: $gray-10;
		outline: none;
		transition: all 0.15s ease;

		&:focus {
			background: rgba($gray-90, 0.5);
			border-color: rgba($blue-50, 0.5);
		}

		&::placeholder {
			color: $gray-60;
		}
	}

	// Override EdraToolBarIcon styles for bubble menu
	:global(.bubble-menu-content .edra-command-button) {
		min-width: 32px;
		min-height: 32px;
		background-color: transparent;
		border-radius: $corner-radius-sm;
		transition: all 0.15s ease;

		&:hover {
			background-color: rgba($gray-85, 0.6);
			transform: translateY(-1px);
		}

		&:active {
			background-color: rgba($gray-85, 0.7);
			transform: translateY(0);
		}

		&.active {
			background-color: rgba($blue-50, 0.1);
			color: $blue-40;

			&:hover {
				background-color: rgba($blue-50, 0.15);
			}
		}
	}

	:global(.bubble-menu-content .edra-toolbar-icon) {
		width: 16px;
		height: 16px;
		stroke-width: 2px;
	}
</style>
