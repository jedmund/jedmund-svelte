<script lang="ts">
	import type { NodeViewProps } from '@tiptap/core';
	import CodeXml from '@lucide/svelte/icons/code-xml';
	import { NodeViewWrapper } from 'svelte-tiptap';
	import strings from '../../strings.js';

	const { editor, deleteNode }: NodeViewProps = $props();

	function toEmbedUrl(url: string): string {
		try {
			const parsed = new URL(url);
			// YouTube: youtube.com/watch?v=ID or youtu.be/ID
			if (parsed.hostname.includes('youtube.com') && parsed.searchParams.has('v')) {
				return `https://www.youtube.com/embed/${parsed.searchParams.get('v')}`;
			}
			if (parsed.hostname === 'youtu.be') {
				return `https://www.youtube.com/embed${parsed.pathname}`;
			}
			// Vimeo: vimeo.com/ID
			const vimeoMatch = parsed.hostname.includes('vimeo.com') && parsed.pathname.match(/^\/(\d+)/);
			if (vimeoMatch) {
				return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
			}
		} catch {
			// Not a valid URL, return as-is
		}
		return url;
	}

	function handleClick(e: MouseEvent) {
		if (!editor.isEditable) return;
		e.preventDefault();
		const iframUrl = prompt(strings.extension.iframe.enterURLPrompt);
		if (iframUrl) {
			editor.chain().focus().setIframe({ src: toEmbedUrl(iframUrl) }).run();
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleClick(e as unknown as MouseEvent);
		} else if (e.key === 'Escape') {
			deleteNode();
		}
	}
</script>

<NodeViewWrapper class="edra-media-placeholder-wrapper" contenteditable="false">
	<div class="iframe-placeholder-container">
		<button
			class="iframe-placeholder-button"
			onclick={handleClick}
			onkeydown={handleKeyDown}
			tabindex="0"
			aria-label={strings.extension.iframe.insertPlaceholder}
		>
			<CodeXml class="iframe-placeholder-icon" />
			<span class="iframe-placeholder-text">{strings.extension.iframe.embedLinkPlaceholder}</span>
		</button>
	</div>
</NodeViewWrapper>

<style lang="scss">
	@import '$styles/variables';

	.iframe-placeholder-container {
		display: flex;
		gap: $unit-half;
		padding: $unit-2x;
		margin: $unit 0;
		border: 2px dashed $gray-85;
		border-radius: $corner-radius-md;
		background: $gray-97;
		transition: all 0.2s ease;
		justify-content: center;
		align-items: center;
	}

	.iframe-placeholder-container:hover {
		border-color: $gray-80;
		background: $gray-95;
	}

	.iframe-placeholder-button {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: $unit;
		padding: $unit $unit-2x;
		border: 1px solid $gray-85;
		border-radius: $corner-radius-sm;
		background: $white;
		cursor: pointer;
		transition: all 0.2s ease;
		min-width: 120px;
	}

	.iframe-placeholder-button:hover {
		border-color: $gray-80;
		background: $gray-97;
		transform: translateY(-1px);
	}

	.iframe-placeholder-button:focus {
		outline: none;
		border-color: $blue-50;
		box-shadow: 0 0 0 3px rgba($blue-50, 0.1);
	}

	:global(.iframe-placeholder-icon) {
		width: $unit-3x;
		height: $unit-3x;
		color: $gray-40;
	}

	.iframe-placeholder-text {
		font-size: 14px;
		color: $gray-40;
		font-weight: 500;
	}
</style>
