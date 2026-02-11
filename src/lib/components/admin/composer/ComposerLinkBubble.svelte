<script lang="ts">
	import { BubbleMenu } from 'svelte-tiptap'
	import type { Editor } from '@tiptap/core'
	import type { ShouldShowProps } from '$lib/components/edra/types'
	import ExternalLink from '@lucide/svelte/icons/external-link'
	import Pencil from '@lucide/svelte/icons/pencil'
	import Copy from '@lucide/svelte/icons/copy'
	import Check from '@lucide/svelte/icons/check'
	import X from '@lucide/svelte/icons/x'
	import Trash2 from '@lucide/svelte/icons/trash-2'

	interface Props {
		editor: Editor
	}

	const { editor }: Props = $props()

	let isEditing = $state(false)
	let linkInput = $state('')
	let linkInputElement = $state<HTMLInputElement>()

	// Reactively derive the link href from the editor state (Edra pattern).
	// This always reflects the current selection's link, not stale state.
	let link = $derived.by(() => editor.getAttributes('link').href ?? '')

	// Check if any node in the selection range has a link mark.
	// Unlike editor.isActive('link'), this returns true even when
	// the link doesn't cover the entire selection.
	function selectionContainsLink(state: ShouldShowProps['state']): boolean {
		const { from, to } = state.selection
		let found = false
		state.doc.nodesBetween(from, to, (node) => {
			if (found) return false
			if (node.marks?.some((m: any) => m.type.name === 'link')) {
				found = true
			}
		})
		return found
	}

	function shouldShow(props: ShouldShowProps) {
		const { editor, state } = props
		const { empty } = state.selection

		// For cursor on a link, or text selection containing a link
		if (empty ? editor.isActive('link') : selectionContainsLink(state)) {
			return true
		}
		isEditing = false
		return false
	}

	function startEditing() {
		isEditing = true
		linkInput = link
		setTimeout(() => linkInputElement?.focus(), 0)
	}

	function handleSubmit() {
		if (!linkInput.trim()) return
		let href = linkInput.trim()
		if (!/^https?:\/\//i.test(href)) {
			href = 'https://' + href
		}
		editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
		isEditing = false
	}

	function cancelEditing() {
		isEditing = false
		linkInput = ''
		editor.commands.focus()
	}

	function copyLink() {
		navigator.clipboard.writeText(link)
	}

	function removeLink() {
		editor.chain().focus().extendMarkRange('link').unsetLink().run()
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault()
			handleSubmit()
		} else if (e.key === 'Escape') {
			e.preventDefault()
			cancelEditing()
		}
	}
</script>

<BubbleMenu
	{editor}
	class="composer-link-bubble"
	{shouldShow}
	pluginKey="composer-link-bubble-menu"
	updateDelay={100}
	tippyOptions={{
		theme: 'bubble-menu',
		popperOptions: {
			placement: 'top',
			modifiers: [
				{
					name: 'preventOverflow',
					options: {
						boundary: 'viewport',
						padding: 8
					}
				},
				{
					name: 'flip',
					options: {
						fallbackPlacements: ['bottom', 'top-start', 'top-end', 'bottom-start', 'bottom-end']
					}
				}
			]
		},
		maxWidth: 'calc(100vw - 16px)',
		duration: [200, 150],
		animation: 'fade'
	}}
>
	<div class="link-bubble-content">
		{#if isEditing}
			<div class="link-edit-container">
				<input
					bind:this={linkInputElement}
					bind:value={linkInput}
					type="url"
					placeholder="Enter URL..."
					class="link-edit-input"
					onkeydown={handleKeydown}
				/>
				<button
					class="link-action-button"
					onclick={handleSubmit}
					disabled={!linkInput.trim()}
					title="Save link"
				>
					<Check size={16} />
				</button>
				<button class="link-action-button" onclick={cancelEditing} title="Cancel">
					<X size={16} />
				</button>
			</div>
		{:else}
			<div class="link-preview-container">
				<a href={link} target="_blank" rel="noopener noreferrer" class="link-pill">
					<ExternalLink size={14} />
					<span class="link-url">{link}</span>
				</a>
				<span class="separator"></span>
				<button class="link-action-button" onclick={startEditing} title="Edit link">
					<Pencil size={16} />
				</button>
				<button class="link-action-button" onclick={copyLink} title="Copy link">
					<Copy size={16} />
				</button>
				<button class="link-action-button link-action-button--danger" onclick={removeLink} title="Remove link">
					<Trash2 size={16} />
				</button>
			</div>
		{/if}
	</div>
</BubbleMenu>

<style lang="scss">
	@import '$styles/variables';

	:global(.composer-link-bubble) {
		z-index: 30;
	}

	.link-bubble-content {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 6px;
		background: rgba($white, 0.95);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid rgba($gray-85, 0.5);
		border-radius: $corner-radius;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
		animation: linkBubbleFadeIn 0.2s ease-out;
	}

	@keyframes linkBubbleFadeIn {
		from {
			opacity: 0;
			transform: scale(0.95) translateY(4px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	.link-preview-container {
		display: flex;
		align-items: center;
		gap: 2px;
	}

	.link-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		background: rgba($gray-95, 0.5);
		border-radius: $corner-radius-sm;
		color: $red-60;
		text-decoration: none;
		font-size: 13px;
		max-width: 220px;
		transition: background 0.15s ease;

		&:hover {
			background: rgba($gray-90, 0.6);
		}
	}

	.link-url {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.separator {
		width: 1px;
		height: 20px;
		background: rgba($gray-85, 0.3);
		margin: 0 2px;
	}

	.link-action-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 32px;
		height: 32px;
		padding: 0 6px;
		background: transparent;
		border: none;
		border-radius: $corner-radius-sm;
		color: $gray-20;
		cursor: pointer;
		transition: all 0.15s ease;

		&:hover {
			background: rgba($gray-85, 0.6);
		}

		&:active {
			background: rgba($gray-85, 0.7);
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}

		&--danger {
			color: $red-60;

			&:hover {
				background: rgba($red-60, 0.1);
			}
		}
	}

	.link-edit-container {
		display: flex;
		align-items: center;
		gap: 4px;
		min-width: 280px;
	}

	.link-edit-input {
		flex: 1;
		padding: 6px 10px;
		background: rgba($gray-95, 0.5);
		border: 1px solid rgba($gray-85, 0.3);
		border-radius: $corner-radius-sm;
		font-size: 13px;
		color: $gray-10;
		outline: none;
		transition: all 0.15s ease;

		&:focus {
			background: rgba($gray-90, 0.5);
			border-color: rgba($red-60, 0.5);
		}

		&::placeholder {
			color: $gray-60;
		}
	}
</style>
