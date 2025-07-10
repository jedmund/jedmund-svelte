<script lang="ts">
	import type { Editor } from '@tiptap/core'
	import type { DropdownPosition } from './types'

	interface Props {
		editor: Editor
		position: DropdownPosition
		features: {
			codeBlocks?: boolean
		}
		onDismiss: () => void
	}

	let { editor, position, features, onDismiss }: Props = $props()

	function selectStyle(action: () => void) {
		action()
		onDismiss()
	}
</script>

<div
	class="dropdown-menu-portal"
	style="position: fixed; top: {position.top}px; left: {position.left}px; z-index: 10000;"
>
	<div class="dropdown-menu">
		<button
			class="dropdown-item"
			onclick={() => selectStyle(() => editor.chain().focus().setParagraph().run())}
		>
			Paragraph
		</button>
		<div class="dropdown-separator"></div>
		<button
			class="dropdown-item"
			onclick={() => selectStyle(() => editor.chain().focus().toggleHeading({ level: 1 }).run())}
		>
			Heading 1
		</button>
		<button
			class="dropdown-item"
			onclick={() => selectStyle(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}
		>
			Heading 2
		</button>
		<button
			class="dropdown-item"
			onclick={() => selectStyle(() => editor.chain().focus().toggleHeading({ level: 3 }).run())}
		>
			Heading 3
		</button>
		<div class="dropdown-separator"></div>
		<button
			class="dropdown-item"
			onclick={() => selectStyle(() => editor.chain().focus().toggleBulletList().run())}
		>
			Unordered List
		</button>
		<button
			class="dropdown-item"
			onclick={() => selectStyle(() => editor.chain().focus().toggleOrderedList().run())}
		>
			Ordered List
		</button>
		<button
			class="dropdown-item"
			onclick={() => selectStyle(() => editor.chain().focus().toggleTaskList().run())}
		>
			Task List
		</button>
		{#if features.codeBlocks}
			<div class="dropdown-separator"></div>
			<button
				class="dropdown-item"
				onclick={() => selectStyle(() => editor.chain().focus().toggleCodeBlock().run())}
			>
				Code Block
			</button>
		{/if}
		<button
			class="dropdown-item"
			onclick={() => selectStyle(() => editor.chain().focus().toggleBlockquote().run())}
		>
			Blockquote
		</button>
	</div>
</div>

<style lang="scss">
	@import '$styles/variables';
	@import '$styles/mixins';

	.dropdown-menu-portal {
		font-family: inherit;
	}

	.dropdown-menu {
		background: $white;
		border: 1px solid $gray-85;
		border-radius: $corner-radius;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		padding: 4px;
		min-width: 200px;
	}

	.dropdown-item {
		display: block;
		width: 100%;
		padding: 8px 12px;
		text-align: left;
		font-size: 14px;
		color: $gray-10;
		background: transparent;
		border: none;
		border-radius: $corner-radius-sm;
		cursor: pointer;
		transition: all 0.15s ease;

		&:hover {
			background: $gray-95;
			color: $gray-00;
		}

		&:active {
			background: $gray-90;
		}
	}

	.dropdown-separator {
		height: 1px;
		background: $gray-90;
		margin: 4px 0;
	}
</style>
