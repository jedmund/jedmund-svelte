<script lang="ts">
	import type { NodeViewProps } from '@tiptap/core'
	import Video from 'lucide-svelte/icons/video'
	import { NodeViewWrapper } from 'svelte-tiptap'
	import { getContext } from 'svelte'
	import ContentInsertionPane from './ContentInsertionPane.svelte'
	import { paneManager } from '$lib/stores/pane-manager'

	const { editor, deleteNode, getPos }: NodeViewProps = $props()

	// Get album context if available
	const editorContext = getContext<any>('editorContext') || {}
	const albumId = $derived(editorContext.albumId)

	// Generate unique pane ID based on node position
	const paneId = $derived(`video-${getPos?.() ?? Math.random()}`)

	let showPane = $state(false)
	let panePosition = $state({ x: 0, y: 0 })

	// Subscribe to pane manager
	const paneState = $derived($paneManager)
	$effect(() => {
		showPane = paneManager.isActive(paneId, paneState)
	})

	function handleClick(e: MouseEvent) {
		if (!editor.isEditable) return
		e.preventDefault()

		// Get position for pane
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
		panePosition = {
			x: rect.left,
			y: rect.bottom + 8
		}
		paneManager.open(paneId)
	}

	// Handle keyboard navigation
	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault()
			handleClick(e as any)
		} else if (e.key === 'Escape') {
			if (showPane) {
				paneManager.close()
			} else {
				deleteNode()
			}
		}
	}
</script>

<NodeViewWrapper class="edra-video-placeholder-wrapper" contenteditable="false">
	<button
		class="edra-video-placeholder-content"
		onclick={handleClick}
		onkeydown={handleKeyDown}
		tabindex="0"
		aria-label="Insert video"
	>
		<Video class="edra-video-placeholder-icon" />
		<span class="edra-video-placeholder-text">Insert video</span>
	</button>

	{#if showPane}
		<ContentInsertionPane
			{editor}
			position={panePosition}
			contentType="video"
			onClose={() => paneManager.close()}
			{deleteNode}
			{albumId}
		/>
	{/if}
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
