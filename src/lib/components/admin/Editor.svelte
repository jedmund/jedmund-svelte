<script lang="ts">
	import EditorWithUpload from './EditorWithUpload.svelte'
	import type { Editor } from '@tiptap/core'
	import type { JSONContent } from '@tiptap/core'

	interface Props {
		data?: JSONContent
		onChange?: (data: JSONContent) => void
		placeholder?: string
		readOnly?: boolean
		minHeight?: number
		autofocus?: boolean
		class?: string
		showToolbar?: boolean
	}

	let {
		data = $bindable({
			type: 'doc',
			content: [{ type: 'paragraph' }]
		}),
		onChange,
		placeholder = 'Type "/" for commands...',
		readOnly = false,
		minHeight = 400,
		autofocus = false,
		class: className = '',
		showToolbar = true
	}: Props = $props()

	let editor = $state<Editor | undefined>()
	let initialized = false

	// Update content when editor changes
	function onUpdate(props: { editor: Editor }) {
		// Skip the first update to avoid circular updates
		if (!initialized) {
			initialized = true
			return
		}

		const json = props.editor.getJSON()
		data = json
		onChange?.(json)
	}

	// Public API
	export function save(): JSONContent | null {
		return editor?.getJSON() || null
	}

	export function clear() {
		editor?.commands.clearContent()
	}

	export function focus() {
		editor?.commands.focus()
	}

	export function getIsDirty(): boolean {
		// This would need to track changes since last save
		return false
	}

	// Focus on mount if requested
	$effect(() => {
		if (editor && autofocus) {
			editor.commands.focus()
		}
	})
</script>

<div class="editor-wrapper {className}" style="--min-height: {minHeight}px">
	<div class="editor-container">
		<EditorWithUpload
			bind:editor
			content={data}
			{onUpdate}
			editable={!readOnly}
			{showToolbar}
			{placeholder}
			showSlashCommands={true}
			showLinkBubbleMenu={true}
			showTableBubbleMenu={true}
			class="editor-content"
		/>
	</div>
</div>

<style lang="scss">
	@import '$styles/variables.scss';
	@import '$styles/mixins.scss';

	.editor-wrapper {
		width: 100%;
		min-height: var(--min-height);
		height: 100%;
		background: white;
		overflow: hidden;
		position: relative;
		display: flex;
		flex-direction: column;
	}

	.editor-container {
		flex: 1;
		overflow-y: auto;
		position: relative;
		display: flex;
		flex-direction: column;
		padding: 0;
	}

	:global(.editor-content) {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	:global(.editor-content .edra) {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	:global(.editor-content .editor-toolbar) {
		border-radius: $card-corner-radius;
		box-sizing: border-box;
		background: $grey-95;
		padding: $unit-2x;
		position: sticky;
		top: 0;
		z-index: 10;
		overflow-x: auto;
		overflow-y: hidden;
		white-space: nowrap;
		-webkit-overflow-scrolling: touch;

		// Hide scrollbar but keep functionality
		scrollbar-width: none;
		-ms-overflow-style: none;

		&::-webkit-scrollbar {
			display: none;
		}

		// Override Edra toolbar styles
		:global(.edra-toolbar) {
			overflow: visible;
			width: auto;
			padding: 0;
			display: flex;
			align-items: center;
			gap: $unit;
		}
	}

	// Override Edra styles to match our design
	:global(.edra-editor) {
		flex: 1;
		min-height: 0;
		height: 100%;
		overflow-y: auto;
		padding: 0 $unit-4x;

		@include breakpoint('phone') {
			padding: $unit-3x;
		}
	}

	:global(.edra .ProseMirror) {
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		font-size: 16px;
		line-height: 1.6;
		color: $grey-10;
		min-height: 100%;
		padding-bottom: 30vh; // Give space for scrolling
	}

	:global(.edra .ProseMirror h1) {
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		font-size: 2rem;
		font-weight: 700;
		margin: $unit-3x 0 $unit-2x;
		line-height: 1.2;
	}

	:global(.edra .ProseMirror h2) {
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		font-size: 1.5rem;
		font-weight: 600;
		margin: $unit-3x 0 $unit-2x;
		line-height: 1.3;
	}

	:global(.edra .ProseMirror h3) {
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		font-size: 1.25rem;
		font-weight: 600;
		margin: $unit-3x 0 $unit-2x;
		line-height: 1.4;
	}

	:global(.edra .ProseMirror p) {
		margin: $unit-2x 0;
	}

	:global(.edra .ProseMirror ul),
	:global(.edra .ProseMirror ol) {
		padding-left: $unit-4x;
		margin: $unit-2x 0;
	}

	:global(.edra .ProseMirror li) {
		margin: $unit 0;
	}

	:global(.edra .ProseMirror blockquote) {
		border-left: 3px solid $grey-80;
		margin: $unit-3x 0;
		padding-left: $unit-3x;
		font-style: italic;
		color: $grey-30;
	}

	:global(.edra .ProseMirror pre) {
		background: $grey-95;
		border: 1px solid $grey-80;
		border-radius: 4px;
		color: $grey-10;
		font-family: 'SF Mono', Monaco, Consolas, 'Courier New', monospace;
		font-size: 0.875rem;
		line-height: 1.5;
		margin: $unit-2x 0;
		padding: $unit-2x;
		overflow-x: auto;
	}

	:global(.edra .ProseMirror code) {
		background: $grey-90;
		border-radius: 0.25rem;
		color: $grey-10;
		font-family: 'SF Mono', Monaco, Consolas, 'Courier New', monospace;
		font-size: 0.875em;
		padding: 0.125rem 0.25rem;
	}

	:global(.edra .ProseMirror hr) {
		border: none;
		border-top: 1px solid $grey-80;
		margin: $unit-4x 0;
	}

	:global(.edra .ProseMirror a) {
		color: #3b82f6;
		text-decoration: underline;
		cursor: pointer;
	}

	:global(.edra .ProseMirror a:hover) {
		color: #2563eb;
	}

	:global(.edra .ProseMirror ::selection) {
		background: rgba(59, 130, 246, 0.15);
	}

	// Placeholder
	:global(.edra .ProseMirror p.is-editor-empty:first-child::before) {
		content: attr(data-placeholder);
		float: left;
		color: #999;
		pointer-events: none;
		height: 0;
	}

	// Focus styles
	:global(.edra .ProseMirror.ProseMirror-focused) {
		outline: none;
	}

	// Loading state
	:global(.edra-loading) {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: var(--min-height);
		color: $grey-50;
		gap: $unit;
	}

	// Image styles
	:global(.edra .ProseMirror img) {
		max-width: 100%;
		width: auto;
		max-height: 400px;
		height: auto;
		border-radius: 4px;
		margin: $unit-2x auto;
		display: block;
		object-fit: contain;
	}

	:global(.edra-media-placeholder-wrapper) {
		margin: $unit-2x 0;
	}

	:global(.edra-media-placeholder-content) {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: $unit;
		padding: $unit-4x;
		border: 2px dashed $grey-80;
		border-radius: 8px;
		background: $grey-95;
		cursor: pointer;
		transition: all 0.2s ease;

		&:hover {
			border-color: $grey-60;
			background: $grey-90;
		}
	}

	:global(.edra-media-placeholder-icon) {
		width: 48px;
		height: 48px;
		color: $grey-50;
	}

	:global(.edra-media-placeholder-text) {
		font-size: 1rem;
		color: $grey-30;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
	}

	// Image container styles
	:global(.edra-media-container) {
		margin: $unit-3x auto;
		position: relative;

		&.align-left {
			margin-left: 0;
		}

		&.align-right {
			margin-right: 0;
			margin-left: auto;
		}

		&.align-center {
			margin-left: auto;
			margin-right: auto;
		}
	}

	:global(.edra-media-content) {
		width: 100%;
		height: auto;
		display: block;
	}

	:global(.edra-media-caption) {
		width: 100%;
		margin-top: $unit;
		padding: $unit $unit-2x;
		border: 1px solid $grey-80;
		border-radius: 4px;
		font-size: 0.875rem;
		color: $grey-30;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		background: $grey-95;

		&:focus {
			outline: none;
			border-color: $grey-60;
			background: white;
		}
	}
</style>
