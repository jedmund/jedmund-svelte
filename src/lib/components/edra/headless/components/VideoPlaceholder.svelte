<script lang="ts">
	import type { NodeViewProps } from '@tiptap/core'
	import Video from 'lucide-svelte/icons/video'
	import { NodeViewWrapper } from 'svelte-tiptap'
	const { editor }: NodeViewProps = $props()

	function handleClick(e: MouseEvent) {
		if (!editor.isEditable) return
		e.preventDefault()
		const videoUrl = prompt('Enter the URL of the video:')
		if (!videoUrl) {
			return
		}
		editor.chain().focus().setVideo(videoUrl).run()
	}
</script>

<NodeViewWrapper class="edra-video-placeholder-wrapper" contenteditable="false">
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<button
		class="edra-video-placeholder-content"
		onclick={handleClick}
		tabindex="0"
		aria-label="Insert A Video"
	>
		<Video class="edra-video-placeholder-icon" />
		<span class="edra-video-placeholder-text">Insert A Video</span>
	</button>
</NodeViewWrapper>

<style lang="scss">
	@import '$styles/variables';

	.edra-video-placeholder-content {
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

	:global(.edra-video-placeholder-icon) {
		width: $unit-3x;
		height: $unit-3x;
	}

	.edra-video-placeholder-text {
		font-size: $font-size-small;
		font-weight: 500;
	}
</style>
