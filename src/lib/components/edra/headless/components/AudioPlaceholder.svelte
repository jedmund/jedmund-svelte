<script lang="ts">
	import type { NodeViewProps } from '@tiptap/core'
	import AudioLines from 'lucide-svelte/icons/audio-lines'
	import { NodeViewWrapper } from 'svelte-tiptap'
	const { editor }: NodeViewProps = $props()

	function handleClick(e: MouseEvent) {
		if (!editor.isEditable) return
		e.preventDefault()
		const audioUrl = prompt('Enter the URL of an audio:')
		if (!audioUrl) {
			return
		}
		editor.chain().focus().setAudio(audioUrl).run()
	}
</script>

<NodeViewWrapper class="edra-audio-placeholder-wrapper" contenteditable="false">
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<button
		class="edra-audio-placeholder-content"
		onclick={handleClick}
		tabindex="0"
		aria-label="Insert An Audio"
	>
		<AudioLines class="edra-audio-placeholder-icon" />
		<span class="edra-audio-placeholder-text">Insert An Audio</span>
	</button>
</NodeViewWrapper>

<style lang="scss">
	@import '$styles/variables';

	.edra-audio-placeholder-content {
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

	:global(.edra-audio-placeholder-icon) {
		width: $unit-3x;
		height: $unit-3x;
	}

	.edra-audio-placeholder-text {
		font-size: $font-size-small;
		font-weight: 500;
	}
</style>
