<script lang="ts">
	import Editor from './Editor.svelte'
	import type { JSONContent } from '@tiptap/core'

	interface Props {
		data?: JSONContent
		onChange?: (content: JSONContent) => void
		placeholder?: string
		minHeight?: number
		autofocus?: boolean
		mode?: 'default' | 'inline'
		showToolbar?: boolean
		class?: string
	}

	let {
		data = $bindable(),
		onChange = () => {},
		placeholder = 'Write your content here...',
		minHeight = 400,
		autofocus = false,
		mode = 'default',
		showToolbar = true,
		class: className = ''
	}: Props = $props()

	let editorRef: Editor | undefined = $state()

	// Forward editor methods if needed
	export function focus() {
		editorRef?.focus()
	}

	export function blur() {
		editorRef?.blur()
	}

	export function getContent() {
		return editorRef?.getContent()
	}

	export function clear() {
		editorRef?.clear()
	}
</script>

<div class={`case-study-editor-wrapper ${mode} ${className}`}>
	<Editor
		bind:this={editorRef}
		bind:data
		{onChange}
		{placeholder}
		{minHeight}
		{autofocus}
		{showToolbar}
		class="case-study-editor"
	/>
</div>

<style lang="scss">
	@import '$styles/variables.scss';

	.case-study-editor-wrapper {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
		width: 100%;
	}

	/* Default mode - used in ProjectForm */
	.case-study-editor-wrapper.default {
		:global(.case-study-editor) {
			flex: 1;
			display: flex;
			flex-direction: column;
			min-height: 0;
		}

		:global(.case-study-editor .edra) {
			flex: 1;
			display: flex;
			flex-direction: column;
			min-height: 0;
		}

		:global(.case-study-editor .editor-toolbar) {
			border-radius: 999px;
			border: 1px solid rgba(0, 0, 0, 0.08);
			box-shadow: 0 0 16px rgba(0, 0, 0, 0.12);
			background: $grey-95;
		}

		:global(.case-study-editor .edra-editor) {
			padding: 0 $unit-4x;
			overflow-y: auto;
			box-sizing: border-box;
		}

		:global(.case-study-editor .ProseMirror) {
			min-height: calc(100% - 80px);
		}

		:global(.case-study-editor .ProseMirror:focus) {
			outline: none;
		}

		:global(.case-study-editor .ProseMirror > * + *) {
			margin-top: 0.75em;
		}

		:global(.case-study-editor .ProseMirror p.is-editor-empty:first-child::before) {
			color: #adb5bd;
			content: attr(data-placeholder);
			float: left;
			height: 0;
			pointer-events: none;
		}
	}

	/* Inline mode - used in UniverseComposer */
	.case-study-editor-wrapper.inline {
		:global(.case-study-editor) {
			border: none !important;
			box-shadow: none !important;
		}

		:global(.case-study-editor .edra-editor) {
			padding: $unit-2x 0;
		}

		:global(.case-study-editor .editor-container) {
			padding: 0 $unit-3x;
		}

		:global(.case-study-editor .editor-content) {
			padding: 0;
			min-height: 80px;
			font-size: 15px;
			line-height: 1.5;
		}

		:global(.case-study-editor .ProseMirror) {
			padding: 0;
			min-height: 80px;
		}

		:global(.case-study-editor .ProseMirror:focus) {
			outline: none;
		}

		:global(.case-study-editor .ProseMirror p) {
			margin: 0;
		}

		:global(
				.case-study-editor .ProseMirror.ProseMirror-focused .is-editor-empty:first-child::before
			) {
			color: $grey-40;
			content: attr(data-placeholder);
			float: left;
			pointer-events: none;
			height: 0;
		}
	}
</style>
