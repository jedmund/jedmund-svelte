<script lang="ts">
	import type { NodeViewProps } from '@tiptap/core'
	import CodeXML from 'lucide-svelte/icons/code-xml'
	import { NodeViewWrapper } from 'svelte-tiptap'
	const { editor }: NodeViewProps = $props()

	function handleClick(e: MouseEvent) {
		if (!editor.isEditable) return
		e.preventDefault()
		const iFrameURL = prompt('Enter the URL of an iFrame:')
		if (!iFrameURL) {
			return
		}
		editor.chain().focus().setIframe({ src: iFrameURL }).run()
	}
</script>

<NodeViewWrapper class="edra-iframe-placeholder-wrapper" contenteditable={false} spellcheck={false}>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<button
		class="edra-iframe-placeholder-content"
		onclick={handleClick}
		tabindex="0"
		aria-label="Insert An IFrame"
	>
		<CodeXML class="edra-iframe-placeholder-icon" />
		<span class="edra-iframe-placeholder-text">Insert An IFrame</span>
	</button>
</NodeViewWrapper>

<style lang="scss">
	@import '$styles/variables';

	.edra-iframe-placeholder-content {
		width: 100%;
		padding: $unit-3x;
		background-color: $gray-95;
		border: 2px dashed $gray-85;
		border-radius: $corner-radius;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: $unit-2x;
		cursor: pointer;
		transition: all 0.2s ease;
		color: $gray-50;

		&:hover {
			background-color: $gray-90;
			border-color: $gray-70;
			color: $gray-40;
		}

		&:focus {
			outline: none;
			border-color: $primary-color;
			box-shadow: 0 0 0 3px rgba($primary-color, 0.1);
		}
	}

	:global(.edra-iframe-placeholder-icon) {
		width: $unit-3x;
		height: $unit-3x;
	}

	.edra-iframe-placeholder-text {
		font-size: $font-size-small;
		font-weight: 500;
	}
</style>
