<script lang="ts">
	import type { NodeViewProps } from '@tiptap/core'
	import { NodeViewWrapper } from 'svelte-tiptap'
	import MoreHorizontal from 'lucide-svelte/icons/more-horizontal'
	import EmbedContextMenu from './EmbedContextMenu.svelte'

	const { editor, node, deleteNode, getPos, selected }: NodeViewProps = $props()

	let loading = $state(false)
	let showActions = $state(false)
	let showContextMenu = $state(false)
	let contextMenuPosition = $state({ x: 0, y: 0 })

	// Check if this is a YouTube URL
	const isYouTube = $derived(/(?:youtube\.com|youtu\.be)/.test(node.attrs.url || ''))

	// Extract video ID from YouTube URL
	const getYouTubeVideoId = (url: string): string | null => {
		const patterns = [
			/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
			/youtube\.com\/watch\?.*v=([^&\n?#]+)/
		]

		for (const pattern of patterns) {
			const match = url.match(pattern)
			if (match && match[1]) {
				return match[1]
			}
		}
		return null
	}

	const getDomain = (url: string) => {
		try {
			const urlObj = new URL(url)
			return urlObj.hostname.replace('www.', '')
		} catch {
			return ''
		}
	}

	const decodeHtmlEntities = (text: string) => {
		if (!text) return ''
		const textarea = document.createElement('textarea')
		textarea.innerHTML = text
		return textarea.value
	}

	async function refreshMetadata() {
		if (!node.attrs.url) return
		loading = true

		try {
			const response = await fetch(
				`/api/og-metadata?url=${encodeURIComponent(node.attrs.url)}&refresh=true`
			)
			if (!response.ok) {
				throw new Error('Failed to fetch metadata')
			}

			const metadata = await response.json()

			// Update the node attributes
			const pos = getPos()
			if (typeof pos === 'number') {
				editor
					.chain()
					.focus()
					.updateAttributes('urlEmbed', {
						title: metadata.title,
						description: metadata.description,
						image: metadata.image,
						favicon: metadata.favicon,
						siteName: metadata.siteName
					})
					.run()
			}
		} catch (err) {
			console.error('Error refreshing metadata:', err)
		} finally {
			loading = false
		}
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
		{@const videoId = getYouTubeVideoId(node.attrs.url || '')}
		<div
			class="edra-youtube-embed-card"
			onmouseenter={() => (showActions = true)}
			onmouseleave={() => (showActions = false)}
			onkeydown={handleKeydown}
			oncontextmenu={handleContextMenu}
			tabindex="0"
			role="article"
		>
			{#if showActions && editor.isEditable}
				<div class="edra-youtube-embed-actions">
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
						class="edra-youtube-embed-action-button"
						title="More options"
					>
						<MoreHorizontal />
					</button>
				</div>
			{/if}

			{#if videoId}
				<div class="edra-youtube-embed-player">
					<iframe
						src="https://www.youtube.com/embed/{videoId}"
						frameborder="0"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
						allowfullscreen
						title="YouTube video player"
					></iframe>
				</div>
			{:else}
				<div class="edra-youtube-embed-error">
					<p>Invalid YouTube URL</p>
				</div>
			{/if}
		</div>
	{:else}
		<div
			class="edra-url-embed-card"
			onmouseenter={() => (showActions = true)}
			onmouseleave={() => (showActions = false)}
			onkeydown={handleKeydown}
			oncontextmenu={handleContextMenu}
			tabindex="0"
			role="article"
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

			<button class="edra-url-embed-content" onclick={openLink}>
				{#if node.attrs.image}
					<div class="edra-url-embed-image">
						<img src={node.attrs.image} alt={node.attrs.title || 'Link preview'} />
					</div>
				{/if}
				<div class="edra-url-embed-text">
					<div class="edra-url-embed-meta">
						{#if node.attrs.favicon}
							<img src={node.attrs.favicon} alt="" class="edra-url-embed-favicon" />
						{/if}
						<span class="edra-url-embed-domain"
							>{node.attrs.siteName
								? decodeHtmlEntities(node.attrs.siteName)
								: getDomain(node.attrs.url)}</span
						>
					</div>
					{#if node.attrs.title}
						<h3 class="edra-url-embed-title">{decodeHtmlEntities(node.attrs.title)}</h3>
					{/if}
					{#if node.attrs.description}
						<p class="edra-url-embed-description">{decodeHtmlEntities(node.attrs.description)}</p>
					{/if}
				</div>
			</button>
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
	.edra-url-embed-wrapper {
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

		&.delete:hover {
			background: #fee;
			color: $red-60;
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}

		svg {
			width: $unit-2x;
			height: $unit-2x;
		}
	}

	.edra-url-embed-content {
		display: flex;
		width: 100%;
		background: $gray-95;
		border-radius: $corner-radius;
		overflow: hidden;
		border: $unit-1px solid $gray-85;
		padding: 0;
		text-align: left;
		cursor: pointer;
		transition: all 0.2s ease;
		/* Reset button styles that might be inherited */
		font-family: inherit;
		font-size: inherit;
		line-height: inherit;
		-webkit-appearance: none;
		-moz-appearance: none;
		appearance: none;

		&:hover {
			border-color: $gray-60;
			transform: translateY(-$unit-1px);
			box-shadow: 0 $unit-2px $unit rgba(0, 0, 0, 0.1);
		}

		&:focus {
			outline: none;
		}
	}

	.edra-url-embed-image {
		flex-shrink: 0;
		width: $unit-20x + $unit;
		height: $unit-18x + $unit-6px;
		overflow: hidden;
		background: $gray-80;

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}
	}

	.edra-url-embed-text {
		flex: 1;
		padding: $unit-2x;
		display: flex;
		flex-direction: column;
		gap: $unit;
		min-width: 0;
	}

	.edra-url-embed-meta {
		display: flex;
		align-items: center;
		gap: $unit;
		font-size: $font-size-extra-small;
		color: $gray-40;
	}

	.edra-url-embed-favicon {
		width: $unit-2x;
		height: $unit-2x;
		flex-shrink: 0;
	}

	.edra-url-embed-domain {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.edra-url-embed-title {
		margin: 0;
		font-size: $font-size;
		font-weight: 600;
		color: $gray-10;
		line-height: 1.3;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		overflow: hidden;
	}

	.edra-url-embed-description {
		margin: 0;
		font-size: $font-size-small;
		color: $gray-30;
		line-height: 1.4;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		overflow: hidden;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.animate-spin {
		animation: spin 1s linear infinite;
	}

	/* YouTube embed styles */
	.edra-youtube-embed-card {
		position: relative;
		width: 100%;
		margin: 0 auto;
	}

	.edra-youtube-embed-actions {
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

	.edra-youtube-embed-action-button {
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

		&:hover {
			background: $gray-95;
			color: $gray-20;
		}

		svg {
			width: $unit-2x;
			height: $unit-2x;
		}
	}

	.edra-youtube-embed-player {
		position: relative;
		padding-bottom: 56.25%; // 16:9 aspect ratio
		height: 0;
		overflow: hidden;
		background: $gray-95;
		border-radius: $corner-radius;
		border: $unit-1px solid $gray-85;

		iframe {
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			border: none;
			border-radius: $corner-radius;
		}
	}

	.edra-youtube-embed-error {
		padding: $unit-6x;
		text-align: center;
		background: $gray-95;
		border: $unit-1px solid $gray-85;
		border-radius: $corner-radius;
		color: $gray-40;
	}

	.edra-url-embed-wrapper.selected {
		.edra-youtube-embed-player,
		.edra-youtube-embed-error {
			border-color: $primary-color;
			box-shadow: 0 0 0 $unit-3px rgba($primary-color, 0.1);
		}
	}

	/* Mobile styles */
	@media (max-width: 640px) {
		.edra-url-embed-content {
			flex-direction: column;
		}

		.edra-url-embed-image {
			width: 100%;
			height: $unit-20x + $unit;
		}
	}
</style>
