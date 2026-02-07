<script lang="ts">
	import { type Editor } from '@tiptap/core'
	import { onMount } from 'svelte'

	import { initiateEditor } from '../editor.js'
	import { getEditorExtensions } from '../editor-extensions.js'
	import './style.css'
	import 'katex/dist/katex.min.css'
	import '../editor.css'
	import '../onedark.css'
	import LinkMenu from './menus/link-menu.svelte'
	import TableRowMenu from './menus/table/table-row-menu.svelte'
	import TableColMenu from './menus/table/table-col-menu.svelte'
	import LoaderCircle from 'lucide-svelte/icons/loader-circle'
	import { focusEditor, type EdraProps } from '../utils.js'

	let {
		class: className = '',
		content = undefined,
		editable = true,
		limit = undefined,
		editor = $bindable<Editor | undefined>(),
		showSlashCommands = true,
		showLinkBubbleMenu = true,
		showTableBubbleMenu = true,
		onUpdate,
		children,
		placeholder = undefined
	}: EdraProps & { placeholder?: string } = $props()

	let element = $state<HTMLElement>()

	onMount(() => {
		const extensions = getEditorExtensions({ showSlashCommands })

		editor = initiateEditor(
			element,
			content,
			limit,
			extensions,
			{
				editable,
				onUpdate,
				onTransaction: (props) => {
					editor = undefined
					editor = props.editor
				}
			},
			placeholder
		)
		return () => editor?.destroy()
	})
</script>

<div class={`edra ${className}`}>
	{@render children?.()}
	{#if editor}
		{#if showLinkBubbleMenu}
			<LinkMenu {editor} />
		{/if}
		{#if showTableBubbleMenu}
			<TableRowMenu {editor} />
			<TableColMenu {editor} />
		{/if}
	{/if}
	{#if !editor}
		<div class="edra-loading">
			<LoaderCircle class="animate-spin" /> Loading...
		</div>
	{/if}
	<div
		bind:this={element}
		role="button"
		tabindex="0"
		onclick={(event) => focusEditor(editor, event)}
		onkeydown={(event) => {
			if (event.key === 'Enter' || event.key === ' ') {
				focusEditor(editor, event)
			}
		}}
		class="edra-editor"
	></div>
</div>

<style>
	:global(.ProseMirror) {
		min-height: 100%;
		position: relative;
		word-wrap: break-word;
		white-space: pre-wrap;
		cursor: auto;
		-webkit-font-variant-ligatures: none;
		font-variant-ligatures: none;
		&:focus {
			outline: none;
		}
	}
</style>
