<script lang="ts">
	import { type Editor } from '@tiptap/core'
	import { BubbleMenu } from 'svelte-tiptap'
	import type { ShouldShowProps } from '../../utils.js'
	import Trash from 'lucide-svelte/icons/trash'
	import Edit from 'lucide-svelte/icons/pen'
	import Check from 'lucide-svelte/icons/check'
	import ExternalLink from 'lucide-svelte/icons/external-link'
	import { tooltip } from '$lib/actions/tooltip'

	interface Props {
		editor: Editor
	}

	let { editor }: Props = $props()

	let link = $state('')
	let isEditing = $state(false)
	let isCopied = $state(false)

	// Update link when editor selection changes
	$effect(() => {
		if (editor && editor.isActive('link')) {
			const attrs = editor.getAttributes('link')
			link = attrs.href || ''
		}
	})

	function setLink(url: string) {
		if (url.trim() === '') {
			editor.chain().focus().extendMarkRange('link').unsetLink().run()
			return
		}
		editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
	}

	let linkInput = $state('')
	let isLinkValid = $state(true)

	$effect(() => {
		isLinkValid = validateURL(linkInput)
	})

	function validateURL(url: string): boolean {
		const urlPattern = new RegExp(
			'^(https?:\\/\\/)?' + // protocol (optional)
				'((([a-zA-Z\\d]([a-zA-Z\\d-]*[a-zA-Z\\d])*)\\.)+[a-zA-Z]{2,}|' + // domain name and extension
				'((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
				'(\\:\\d+)?(\\/[-a-zA-Z\\d%_.~+]*)*' + // port and path
				'(\\?[;&a-zA-Z\\d%_.~+=-]*)?' + // query string
				'(\\#[-a-zA-Z\\d_]*)?$', // fragment locator
			'i'
		)
		return urlPattern.test(url)
	}
</script>

<BubbleMenu
	{editor}
	pluginKey="link-menu"
	shouldShow={(props: ShouldShowProps) => {
		if (!props.editor.isEditable) return false
		if (props.editor.isActive('link')) {
			// Update link state when bubble menu is shown
			const attrs = props.editor.getAttributes('link')
			link = attrs.href || ''
			return true
		} else {
			isEditing = false
			linkInput = ''
			isLinkValid = true
			return false
		}
	}}
	class="bubble-menu-wrapper link-bubble-menu"
	tippyOptions={{
		animation: 'scale',
		duration: [200, 150],
		inertia: true
	}}
>
	{#if isEditing}
		<div class="link-edit-container">
			<input
				type="text"
				bind:value={linkInput}
				placeholder="Enter the URL"
				disabled={!isEditing}
				class:valid={isLinkValid}
				class:invalid={!isLinkValid}
			/>
			<button
				class="edra-command-button"
				onclick={() => {
					isEditing = false
					editor.commands.focus()
					setLink(linkInput)
				}}
				disabled={!isLinkValid}
			>
				<Check class="edra-toolbar-icon" />
			</button>
		</div>
	{:else}
		<button
			class="link-url-display"
			class:copied={isCopied}
			onclick={() => {
				navigator.clipboard.writeText(link)
				isCopied = true
				// Reset after animation
				setTimeout(() => {
					isCopied = false
				}, 800)
			}}
			use:tooltip={'Click to copy URL'}
		>
			{link}
		</button>
		<div class="link-actions">
			<button
				class="edra-command-button"
				onclick={() => {
					linkInput = link
					isEditing = true
				}}
				use:tooltip={'Edit URL'}
			>
				<Edit class="edra-toolbar-icon" />
			</button>
			<button
				class="edra-command-button"
				onclick={() => {
					let url = link
					// Ensure the URL has a protocol
					if (!/^https?:\/\//i.test(url)) {
						url = 'https://' + url
					}
					window.open(url, '_blank', 'noopener,noreferrer')
				}}
				use:tooltip={'Open in new tab'}
			>
				<ExternalLink class="edra-toolbar-icon" />
			</button>
			<button
				class="edra-command-button danger"
				onclick={() => {
					editor.chain().focus().extendMarkRange('link').unsetLink().run()
				}}
				use:tooltip={'Remove link'}
			>
				<Trash class="edra-toolbar-icon" />
			</button>
		</div>
	{/if}
</BubbleMenu>

<style lang="scss">
	@import '$styles/variables.scss';
	@import '../../tooltip.scss';

	.link-bubble-menu {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 0.75rem;
		background: white;
		border: 1px solid $grey-85;
		border-radius: $unit;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		min-width: 280px;
		vertical-align: middle;
		align-items: center;
	}

	.link-url-display {
		font-size: 0.8125rem;
		color: $grey-40;
		min-width: 120px;
		max-width: 320px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		padding: 0.375rem 0.5rem;
		background: $grey-80;
		border-radius: $unit-half;
		font-family: $font-stack;
		min-height: 32px;
		line-height: 1.4;
		border: none;
		cursor: pointer;
		text-align: left;
		width: 100%;
		transition: background-color 0.2s ease;

		&:hover {
			background: $grey-85;
		}

		&.copied {
			animation: copy-flash 0.8s ease-out;
		}
	}

	@keyframes copy-flash {
		0% {
			background-color: #4ade80; // Start with green
			color: white;
		}
		100% {
			background-color: $grey-80; // Decay to original gray
			color: $grey-40;
		}
	}

	.link-actions {
		display: flex;
		gap: 0.375rem;
		align-items: center;
		justify-content: center;
		padding: 0.125rem 0;

		:global(.edra-command-button) {
			background: none;
		}

		:global(.edra-command-button svg) {
			stroke: $grey-30;
		}

		:global(.edra-command-button:hover svg) {
			stroke: $grey-10;
		}

		:global(.edra-command-button.danger:hover svg) {
			stroke: $red-60;
		}
	}

	.link-edit-container {
		display: flex;
		gap: 0.375rem;
		align-items: center;
		width: 100%;
		animation: fade-in 0.15s ease-out;
	}

	@keyframes fade-in {
		0% {
			opacity: 0;
		}
		100% {
			opacity: 1;
		}
	}

	.link-edit-container input {
		flex: 1;
		min-width: 220px;
		padding: 0.3125rem 0.75rem;
		border: 1px solid $grey-85;
		border-radius: $unit-half;
		font-size: 0.875rem;
		font-family: $font-stack;
		outline: none;
		background: white;
		transition: border-color 0.2s ease;
		height: 32px;
		box-sizing: border-box;
	}

	.link-edit-container input:focus {
		border-color: $blue-50;
		box-shadow: 0 0 0 3px rgba($blue-50, 0.1);
	}

	.link-edit-container input.invalid {
		border-color: $red-60;
		background-color: rgba($red-60, 0.05);
	}

	:global(.link-bubble-menu .edra-command-button) {
		padding: 0.375rem;
		border-radius: $unit-half;
		transition: all 0.2s ease;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;

		&:hover {
			background-color: $grey-80;
		}

		&.danger {
			color: $red-60;

			&:hover {
				background-color: rgba($red-60, 0.1);
			}
		}
	}

	:global(.link-bubble-menu .edra-toolbar-icon) {
		width: 18px;
		height: 18px;
	}
</style>
