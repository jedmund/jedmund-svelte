<script lang="ts">
	import UrlEmbedPreview from './UrlEmbedPreview.svelte'
	import YouTubeEmbed from './YouTubeEmbed.svelte'
	import { onDestroy } from 'svelte'
	import { createEmbedMetadataSession, type MetadataStatus } from './embed-metadata'
	import { loadEmbedMetadata } from './embed-requests'
	import type { NodeViewProps } from '@tiptap/core'
	import { NodeViewWrapper } from '$lib/components/edra/tiptap/index.js'
	import MoreHorizontal from '@lucide/svelte/icons/more-horizontal'
	import EmbedContextMenu from './EmbedContextMenu.svelte'

	const { editor, node, deleteNode, getPos, selected }: NodeViewProps = $props()

	let showActions = $state(false)
	let showContextMenu = $state(false)
	let contextMenuPosition = $state({ x: 0, y: 0 })
	let status = $state<MetadataStatus>('idle')
	let lastFetchedUrl: string | null = null
	const metadataSession = createEmbedMetadataSession({
		load: loadEmbedMetadata,
		status: (next) => {
			status = next
		},
		apply: (url, metadata) => {
			if (node.attrs.url !== url || editor.isDestroyed) return
			const pos = getPos()
			if (typeof pos !== 'number') return
			editor.view.dispatch(
				editor.state.tr.setNodeMarkup(pos, undefined, {
					...node.attrs,
					title: metadata.title,
					description: metadata.description,
					image: metadata.image,
					favicon: metadata.favicon,
					siteName: metadata.siteName
				})
			)
		}
	})
	onDestroy(() => metadataSession.dispose())

	// Check if this is a YouTube URL
	const isYouTube = $derived(/(?:youtube\.com|youtu\.be)/.test(node.attrs.url || ''))

	// Auto-fetch metadata when node has URL but is missing title/image. Re-runs if url changes.
	$effect(() => {
		const url = node.attrs.url
		if (!url || isYouTube) return
		if (node.attrs.title && node.attrs.image) return
		if (url === lastFetchedUrl) return
		lastFetchedUrl = url
		refreshMetadata()
	})

	function refreshMetadata() {
		return metadataSession.refresh(node.attrs.url)
	}

	function retryFetch(event: MouseEvent) {
		event.stopPropagation()
		lastFetchedUrl = null
		refreshMetadata()
	}

	function openLink() {
		if (node.attrs.url) {
			window.open(node.attrs.url, '_blank', 'noopener,noreferrer')
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Delete' || e.key === 'Backspace') {
			deleteNode()
		}
	}

	function convertToLink() {
		const pos = getPos()
		if (typeof pos !== 'number') return

		// Get the URL and title
		const url = node.attrs.url
		if (!url) {
			console.error('No URL found in embed node')
			return
		}

		const text = node.attrs.title || url

		// Delete the embed node and insert a link
		editor
			.chain()
			.focus()
			.deleteRange({ from: pos, to: pos + node.nodeSize })
			.insertContent({
				type: 'text',
				text: text,
				marks: [
					{
						type: 'link',
						attrs: {
							href: url,
							target: '_blank',
							rel: 'noopener noreferrer'
						}
					}
				]
			})
			.run()
	}

	function handleContextMenu(event: MouseEvent) {
		if (!editor.isEditable) return

		event.preventDefault()
		contextMenuPosition = {
			x: event.clientX,
			y: event.clientY
		}
		showContextMenu = true
	}

	function copyLink() {
		if (node.attrs.url) {
			navigator.clipboard.writeText(node.attrs.url)
		}
		showContextMenu = false
	}

	function dismissContextMenu() {
		showContextMenu = false
	}
</script>

<NodeViewWrapper
	class="edra-url-embed-wrapper {selected ? 'selected' : ''}"
	contenteditable={false}
	data-drag-handle
>
	{#if isYouTube}
		<YouTubeEmbed
			url={node.attrs.url || ''}
			editable={editor.isEditable}
			{handleKeydown}
			{handleContextMenu}
			onmenu={(position) => {
				contextMenuPosition = position
				showContextMenu = true
			}}
		/>
	{:else}
		<div
			class="edra-url-embed-card"
			onmouseenter={() => (showActions = true)}
			onmouseleave={() => (showActions = false)}
			onkeydown={handleKeydown}
			oncontextmenu={handleContextMenu}
			tabindex="0"
			role="button"
		>
			{#if showActions && editor.isEditable}
				<div class="edra-url-embed-actions">
					<button
						onclick={(e) => {
							e.stopPropagation()
							const rect = e.currentTarget.getBoundingClientRect()
							contextMenuPosition = {
								x: rect.left,
								y: rect.bottom + 4
							}
							showContextMenu = true
						}}
						class="edra-url-embed-action-button edra-url-embed-menu-button"
						title="More options"
					>
						<MoreHorizontal />
					</button>
				</div>
			{/if}

			<UrlEmbedPreview attributes={node.attrs} {status} {openLink} {retryFetch} />
		</div>
	{/if}
</NodeViewWrapper>

{#if showContextMenu}
	<EmbedContextMenu
		x={contextMenuPosition.x}
		y={contextMenuPosition.y}
		url={node.attrs.url || ''}
		onConvertToLink={() => {
			convertToLink()
			showContextMenu = false
		}}
		onCopyLink={copyLink}
		onRefresh={() => {
			refreshMetadata()
			showContextMenu = false
		}}
		onOpenLink={() => {
			openLink()
			showContextMenu = false
		}}
		onRemove={() => {
			deleteNode()
			showContextMenu = false
		}}
		onDismiss={dismissContextMenu}
	/>
{/if}

<style lang="scss">
	/* NodeViewWrapper renders the wrapper div; Svelte can't see it */
	:global(.edra-url-embed-wrapper) {
		margin: 1.5rem 0;
		position: relative;
	}

	.edra-url-embed-card {
		position: relative;
		width: 100%;
		max-width: 600px;
		border: $unit-1px solid transparent;
		border-radius: $corner-radius;
		transition: all 0.2s ease;
	}

	.edra-url-embed-actions {
		position: absolute;
		top: $unit;
		right: $unit;
		display: flex;
		gap: $unit-half;
		background: white;
		padding: $unit-half;
		border-radius: $corner-radius-sm;
		box-shadow: 0 $unit-2px $unit rgba(0, 0, 0, 0.15);
		z-index: 10;
	}

	.edra-url-embed-action-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: $unit-4x;
		height: $unit-4x;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: $corner-radius-xs;
		cursor: pointer;
		transition: all 0.2s;
		color: $gray-40;

		&:hover:not(:disabled) {
			background: $gray-95;
			color: $gray-20;
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}

		:global(svg) {
			width: $unit-2x;
			height: $unit-2x;
		}
	}
</style>
