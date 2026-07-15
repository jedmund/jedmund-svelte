<script lang="ts">
	import { icons } from '@lucide/svelte'
	import type { EdraCommand, EdraToolBarCommands } from '../../commands/types.js'
	import { type Editor } from '@tiptap/core'

	interface Props {
		editor: Editor
		command: EdraToolBarCommands | EdraCommand
		style?: string
		onclick?: () => void
	}

	const { editor, command, style, onclick }: Props = $props()

	const Icon = $derived('iconName' in command ? icons[command.iconName] : command.icon)
	const tooltip = $derived('iconName' in command ? command.label : command.tooltip)
	const shortcut = $derived(
		'iconName' in command ? command.shortCuts?.join(', ') : command.shortCut
	)

	function handleClick() {
		if (onclick) return onclick()
		if ('iconName' in command) return command.action(editor)
		return command.onClick?.(editor)
	}

	function isActive() {
		return command.isActive?.(editor) ?? false
	}

	function isDisabled() {
		return 'clickable' in command && command.clickable ? !command.clickable(editor) : false
	}
</script>

<button
	class="edra-command-button"
	class:active={isActive()}
	{style}
	onclick={handleClick}
	disabled={isDisabled()}
	title={`${tooltip ?? ''} ${shortcut ?? ''}`.trim()}
>
	<Icon class="edra-toolbar-icon" />
</button>
