<script lang="ts">
	import { onDestroy, onMount, type Snippet } from 'svelte'
	import { NodeViewWrapper } from '$lib/components/edra/tiptap/index.js'
	import type { NodeViewProps } from '@tiptap/core'
	import NodeToolbar from './NodeToolbar.svelte'
	import strings from '../../strings.js'

	import CopyIcon from '@lucide/svelte/icons/copy'
	import Fullscreen from '@lucide/svelte/icons/fullscreen'
	import Trash from '@lucide/svelte/icons/trash'
	import Captions from '@lucide/svelte/icons/captions'
	import Text from '@lucide/svelte/icons/text'

	import { duplicateNode } from '../../node-actions.js'

	interface MediaExtendedProps extends NodeViewProps {
		children: Snippet<[]>
		mediaRef?: HTMLElement
	}

	const {
		node,
		editor,
		selected,
		deleteNode,
		getPos,
		updateAttributes,
		children,
		mediaRef = $bindable()
	}: MediaExtendedProps = $props()

	const minWidthPercent = 15
	const maxWidthPercent = 100

	// Legacy uploads store pixel widths as numbers; resizing stores CSS percentages.
	const mediaWidth = $derived.by(() => {
		const width = typeof node.attrs.width === 'string' ? node.attrs.width.trim() : node.attrs.width
		if (width == null || width === '') return '100%'
		if (typeof width === 'number' || /^\d+(?:\.\d+)?$/.test(width)) return `${width}px`
		return width
	})

	let nodeRef = $state<HTMLElement>()
	let groupRef = $state<HTMLElement>()

	let resizing = $state(false)
	let resizingInitialWidthPercent = $state(0)
	let resizingInitialMouseX = $state(0)
	let resizingPosition = $state<'left' | 'right'>('left')

	let captionVisible = $state(Boolean(node.attrs.title))
	let altVisible = $state(false)
	$effect(() => {
		if (node.attrs.title) captionVisible = true
	})

	function handleResizingPosition(e: MouseEvent, position: 'left' | 'right') {
		startResize(e)
		resizingPosition = position
	}

	function startResize(e: MouseEvent) {
		e.preventDefault()
		resizing = true
		resizingInitialMouseX = e.clientX
		if (mediaRef && nodeRef?.parentElement) {
			const currentWidth = mediaRef.offsetWidth
			const parentWidth = nodeRef.parentElement.offsetWidth
			resizingInitialWidthPercent = (currentWidth / parentWidth) * 100
		}
	}

	function resize(e: MouseEvent) {
		if (!resizing || !nodeRef?.parentElement) return
		let dx = e.clientX - resizingInitialMouseX
		if (resizingPosition === 'left') {
			dx = resizingInitialMouseX - e.clientX
		}
		const parentWidth = nodeRef.parentElement.offsetWidth
		const deltaPercent = (dx / parentWidth) * 100
		const newWidthPercent = Math.max(
			Math.min(resizingInitialWidthPercent + deltaPercent, maxWidthPercent),
			minWidthPercent
		)
		updateAttributes({ width: `${newWidthPercent}%` })
	}

	function endResize() {
		resizing = false
		resizingInitialMouseX = 0
		resizingInitialWidthPercent = 0
	}

	function handleTouchStart(e: TouchEvent, position: 'left' | 'right') {
		e.preventDefault()
		resizing = true
		resizingPosition = position
		resizingInitialMouseX = e.touches[0].clientX
		if (mediaRef && nodeRef?.parentElement) {
			const currentWidth = mediaRef.offsetWidth
			const parentWidth = nodeRef.parentElement.offsetWidth
			resizingInitialWidthPercent = (currentWidth / parentWidth) * 100
		}
	}

	function handleTouchMove(e: TouchEvent) {
		if (!resizing || !nodeRef?.parentElement) return
		let dx = e.touches[0].clientX - resizingInitialMouseX
		if (resizingPosition === 'left') {
			dx = resizingInitialMouseX - e.touches[0].clientX
		}
		const parentWidth = nodeRef.parentElement.offsetWidth
		const deltaPercent = (dx / parentWidth) * 100
		const newWidthPercent = Math.max(
			Math.min(resizingInitialWidthPercent + deltaPercent, maxWidthPercent),
			minWidthPercent
		)
		updateAttributes({ width: `${newWidthPercent}%` })
	}

	function handleTouchEnd() {
		resizing = false
		resizingInitialMouseX = 0
		resizingInitialWidthPercent = 0
	}

	onMount(() => {
		// Attach id to nodeRef
		nodeRef = groupRef?.parentElement ?? undefined

		// Mouse events
		window.addEventListener('mousemove', resize)
		window.addEventListener('mouseup', endResize)
		// Touch events
		window.addEventListener('touchmove', handleTouchMove)
		window.addEventListener('touchend', handleTouchEnd)
	})

	onDestroy(() => {
		window.removeEventListener('mousemove', resize)
		window.removeEventListener('mouseup', endResize)
		window.removeEventListener('touchmove', handleTouchMove)
		window.removeEventListener('touchend', handleTouchEnd)
	})
</script>

<NodeViewWrapper
	style={`width: ${mediaWidth}`}
	class={`edra-media-container ${selected ? 'selected' : ''} align-center`}
>
	<div bind:this={groupRef} class={`edra-media-group ${resizing ? 'resizing' : ''}`}>
		{@render children()}

		{#if captionVisible}
			<input
				value={node.attrs.title ?? ''}
				type="text"
				class="edra-media-caption"
				aria-label="Caption"
				placeholder="Add a caption"
				readonly={!editor.isEditable}
				oninput={(event) => updateAttributes({ title: event.currentTarget.value || null })}
			/>
		{/if}
		{#if altVisible && node.type.name === 'image'}
			<input
				value={node.attrs.alt ?? ''}
				type="text"
				class="edra-media-caption"
				aria-label="Alt text"
				placeholder="Describe this image"
				readonly={!editor.isEditable}
				oninput={(event) => updateAttributes({ alt: event.currentTarget.value })}
			/>
		{/if}

		{#if editor?.isEditable}
			<div
				role="button"
				tabindex="0"
				aria-label={strings.extension.media.resizeLeft}
				class="edra-media-resize-handle edra-media-resize-handle-left"
				onmousedown={(event: MouseEvent) => {
					handleResizingPosition(event, 'left')
				}}
				ontouchstart={(event: TouchEvent) => {
					handleTouchStart(event, 'left')
				}}
			>
				<div class="edra-media-resize-indicator"></div>
			</div>

			<div
				role="button"
				tabindex="0"
				aria-label={strings.extension.media.resizeRight}
				class="edra-media-resize-handle edra-media-resize-handle-right"
				onmousedown={(event: MouseEvent) => {
					handleResizingPosition(event, 'right')
				}}
				ontouchstart={(event: TouchEvent) => {
					handleTouchStart(event, 'right')
				}}
			>
				<div class="edra-media-resize-indicator"></div>
			</div>

			<NodeToolbar anchor={groupRef} {selected}>
				<button
					type="button"
					class="edra-toolbar-button"
					class:active={captionVisible}
					aria-pressed={captionVisible}
					onclick={() => (captionVisible = !captionVisible)}
					title="Caption"><Captions size={16} /></button
				>
				{#if node.type.name === 'image'}
					<button
						type="button"
						class="edra-toolbar-button"
						class:active={altVisible}
						aria-pressed={altVisible}
						onclick={() => (altVisible = !altVisible)}
						title="Alt text"><Text size={16} /></button
					>
				{/if}
				<div class="edra-toolbar-divider"></div>

				<button
					type="button"
					class="edra-toolbar-button"
					onclick={() => {
						duplicateNode(editor, node, getPos)
					}}
					title={strings.extension.media.duplicate}
				>
					<CopyIcon size={16} strokeWidth={2} />
				</button>
				<button
					type="button"
					class="edra-toolbar-button"
					onclick={() => {
						updateAttributes({
							width: '100%'
						})
					}}
					title={strings.extension.media.fullscreen}
				>
					<Fullscreen size={16} strokeWidth={2} />
				</button>
				<button
					type="button"
					class="edra-toolbar-button edra-destructive"
					onclick={() => {
						deleteNode()
					}}
					title={strings.extension.media.delete}
				>
					<Trash size={16} strokeWidth={2} />
				</button>
			</NodeToolbar>
		{/if}
	</div>
</NodeViewWrapper>
