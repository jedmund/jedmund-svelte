<script lang="ts">
	import type { NodeViewProps } from '@tiptap/core'
	import MapPin from '@lucide/svelte/icons/map-pin'
	import { NodeViewWrapper } from 'svelte-tiptap'
	import { getContext } from 'svelte'
	import ContentInsertionPane from './ContentInsertionPane.svelte'
	import { paneManager } from '$lib/stores/pane-manager'

	const { editor, deleteNode, getPos }: NodeViewProps = $props()

	// Get album context if available
	const editorContext = getContext<{ albumId?: number; [key: string]: unknown }>('editorContext') || {}
	const albumId = $derived(editorContext.albumId)

	// Generate unique pane ID based on node position
	const paneId = $derived(`location-${getPos?.() ?? Math.random()}`)

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
			handleClick(e as unknown as MouseEvent)
		} else if (e.key === 'Escape') {
			if (showPane) {
				paneManager.close()
			} else {
				deleteNode()
			}
		}
	}
</script>

<NodeViewWrapper class="edra-geolocation-placeholder-wrapper" contenteditable="false">
	<button
		class="edra-geolocation-placeholder-content"
		onclick={handleClick}
		onkeydown={handleKeyDown}
		tabindex="0"
		aria-label="Insert location"
	>
		<MapPin class="edra-geolocation-placeholder-icon" />
		<span class="edra-geolocation-placeholder-text">Insert location</span>
	</button>

	{#if showPane}
		<ContentInsertionPane
			{editor}
			position={panePosition}
			contentType="location"
			onClose={() => paneManager.close()}
			{deleteNode}
			{albumId}
		/>
	{/if}
</NodeViewWrapper>

<style lang="scss">
	@import '$styles/variables';

	.edra-geolocation-placeholder-content {
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

	:global(.edra-geolocation-placeholder-icon) {
		width: $unit-3x;
		height: $unit-3x;
	}

	.edra-geolocation-placeholder-text {
		font-size: $font-size-small;
		font-weight: 500;
	}
</style>
