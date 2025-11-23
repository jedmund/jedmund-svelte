<script lang="ts">
	import type { Editor } from '@tiptap/core'
	import { clickOutside } from '$lib/actions/clickOutside'

	interface Props {
		editor: Editor
		isOpen: boolean
		onClose: () => void
		features: any
	}

	const { editor, isOpen, onClose, features }: Props = $props()

	// Text style options
	const textStyles = [
		{
			name: 'paragraph',
			label: 'Paragraph',
			action: () => editor.chain().focus().setParagraph().run()
		},
		{
			name: 'heading1',
			label: 'Heading 1',
			action: () => editor.chain().focus().toggleHeading({ level: 1 }).run()
		},
		{
			name: 'heading2',
			label: 'Heading 2',
			action: () => editor.chain().focus().toggleHeading({ level: 2 }).run()
		},
		{
			name: 'heading3',
			label: 'Heading 3',
			action: () => editor.chain().focus().toggleHeading({ level: 3 }).run()
		},
		{
			name: 'bulletList',
			label: 'Bullet List',
			action: () => editor.chain().focus().toggleBulletList().run()
		},
		{
			name: 'orderedList',
			label: 'Ordered List',
			action: () => editor.chain().focus().toggleOrderedList().run()
		},
		{
			name: 'taskList',
			label: 'Task List',
			action: () => editor.chain().focus().toggleTaskList().run()
		},
		{
			name: 'blockquote',
			label: 'Blockquote',
			action: () => editor.chain().focus().toggleBlockquote().run()
		}
	]

	// Add code block if feature is enabled
	if (features?.codeBlocks) {
		textStyles.push({
			name: 'codeBlock',
			label: 'Code Block',
			action: () => editor.chain().focus().toggleCodeBlock().run()
		})
	}

	function handleSelect(action: () => void) {
		action()
		onClose()
	}
</script>

{#if isOpen}
	<div class="bubble-text-style-menu" use:clickOutside onclickoutside={onClose}>
		{#each textStyles as style}
			<button
				class="text-style-option"
				class:active={(style.name === 'paragraph' &&
					!editor.isActive('heading') &&
					!editor.isActive('bulletList') &&
					!editor.isActive('orderedList') &&
					!editor.isActive('taskList') &&
					!editor.isActive('blockquote') &&
					!editor.isActive('codeBlock')) ||
					(style.name === 'heading1' && editor.isActive('heading', { level: 1 })) ||
					(style.name === 'heading2' && editor.isActive('heading', { level: 2 })) ||
					(style.name === 'heading3' && editor.isActive('heading', { level: 3 })) ||
					(style.name === 'bulletList' && editor.isActive('bulletList')) ||
					(style.name === 'orderedList' && editor.isActive('orderedList')) ||
					(style.name === 'taskList' && editor.isActive('taskList')) ||
					(style.name === 'blockquote' && editor.isActive('blockquote')) ||
					(style.name === 'codeBlock' && editor.isActive('codeBlock'))}
				onclick={() => handleSelect(style.action)}
			>
				{style.label}
			</button>
		{/each}
	</div>
{/if}

<style lang="scss">
	@import '$styles/variables';
	@import '$styles/mixins';

	.bubble-text-style-menu {
		position: absolute;
		top: 100%;
		left: 0;
		margin-top: 4px;
		z-index: 50;
		background: rgba($white, 0.98);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid rgba($gray-85, 0.3);
		border-radius: $corner-radius-md;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
		padding: 4px;
		min-width: 180px;
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

	.text-style-option {
		display: block;
		width: 100%;
		padding: 8px 12px;
		background: transparent;
		border: none;
		border-radius: $corner-radius-sm;
		text-align: left;
		font-size: 13px;
		color: $gray-10;
		cursor: pointer;
		transition: all 0.15s ease;

		&:hover {
			background: rgba($gray-90, 0.5);
		}

		&.active {
			background: rgba($blue-50, 0.1);
			color: $blue-40;
			font-weight: 500;
		}
	}
</style>
