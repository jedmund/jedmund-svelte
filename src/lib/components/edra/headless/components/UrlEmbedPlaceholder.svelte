<script lang="ts">
	import type { NodeViewProps } from '@tiptap/core'
	import Link from 'lucide-svelte/icons/link'
	import LoaderCircle from 'lucide-svelte/icons/loader-circle'
	import AlertCircle from 'lucide-svelte/icons/alert-circle'
	import { NodeViewWrapper } from 'svelte-tiptap'
	import { onMount } from 'svelte'

	const { editor, node, deleteNode, getPos }: NodeViewProps = $props()

	let loading = $state(true)
	let error = $state(false)
	let errorMessage = $state('')
	let inputUrl = $state(node.attrs.url || '')
	let showInput = $state(!node.attrs.url)

	async function fetchMetadata(url: string) {
		loading = true
		error = false
		errorMessage = ''

		try {
			const response = await fetch(`/api/og-metadata?url=${encodeURIComponent(url)}`)
			if (!response.ok) {
				throw new Error('Failed to fetch metadata')
			}

			const metadata = await response.json()

			// Replace this placeholder with the actual URL embed
			const pos = getPos()
			if (typeof pos === 'number') {
				editor
					.chain()
					.focus()
					.insertContentAt({ from: pos, to: pos + node.nodeSize }, [
						{
							type: 'urlEmbed',
							attrs: {
								url: url,
								title: metadata.title,
								description: metadata.description,
								image: metadata.image,
								favicon: metadata.favicon,
								siteName: metadata.siteName
							}
						},
						{
							type: 'paragraph'
						}
					])
					.run()
			}
		} catch (err) {
			console.error('Error fetching URL metadata:', err)
			error = true
			errorMessage = 'Failed to load preview. Please check the URL and try again.'
			loading = false
		}
	}

	function handleSubmit() {
		if (!inputUrl.trim()) return

		// Basic URL validation
		try {
			new URL(inputUrl)
			fetchMetadata(inputUrl)
		} catch {
			error = true
			errorMessage = 'Please enter a valid URL'
			loading = false
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			handleSubmit()
		} else if (e.key === 'Escape') {
			deleteNode()
		}
	}

	function handleClick(e: MouseEvent) {
		if (!editor.isEditable) return
		e.preventDefault()

		if (!showInput) {
			showInput = true
		}
	}

	onMount(() => {
		// If we have a URL from paste, fetch metadata immediately
		if (node.attrs.url) {
			fetchMetadata(node.attrs.url)
		}
	})
</script>

<NodeViewWrapper class="edra-url-embed-placeholder-wrapper" contenteditable={false}>
	{#if showInput && !node.attrs.url}
		<div class="url-input-container">
			<input
				bind:value={inputUrl}
				onkeydown={handleKeydown}
				placeholder="Paste or type a URL..."
				class="url-input"
				autofocus
			/>
			<button onclick={handleSubmit} class="submit-button" disabled={!inputUrl.trim()}>
				Embed
			</button>
		</div>
	{:else if loading}
		<div class="placeholder-content loading">
			<LoaderCircle class="animate-spin placeholder-icon" />
			<span class="placeholder-text">Loading preview...</span>
		</div>
	{:else if error}
		<div class="placeholder-content error">
			<AlertCircle class="placeholder-icon" />
			<div class="error-content">
				<span class="placeholder-text">{errorMessage}</span>
				<button
					onclick={() => {
						showInput = true
						error = false
					}}
					class="retry-button"
				>
					Try another URL
				</button>
			</div>
		</div>
	{:else}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<span
			class="placeholder-content"
			onclick={handleClick}
			tabindex="0"
			role="button"
			aria-label="Insert URL embed"
		>
			<Link class="placeholder-icon" />
			<span class="placeholder-text">Embed a link</span>
		</span>
	{/if}
</NodeViewWrapper>

<style lang="scss">
	@import '$styles/variables';

	.edra-url-embed-placeholder-wrapper {
		margin-bottom: 1rem;
		margin-left: 2.25rem;
		margin-right: 2.25rem;

		@media (max-width: 768px) {
			margin-left: 2rem;
			margin-right: 2rem;
		}
	}

	.url-input-container {
		display: flex;
		gap: $unit-half;
		padding: $unit-2x;
		background: $gray-95;
		border: 2px solid $gray-85;
		border-radius: $corner-radius;
	}

	.url-input {
		flex: 1;
		padding: $unit $unit-2x;
		border: 1px solid $gray-80;
		border-radius: $corner-radius-sm;
		font-size: $font-size-small;
		background: $white;

		&:focus {
			outline: none;
			border-color: $primary-color;
		}
	}

	.submit-button {
		padding: $unit $unit-2x;
		background: $primary-color;
		color: $white;
		border: none;
		border-radius: $corner-radius-sm;
		font-size: $font-size-small;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;

		&:hover:not(:disabled) {
			background: darken($primary-color, 10%);
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}

	.placeholder-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: $unit-half;
		padding: $unit-3x;
		border: 2px dashed $gray-85;
		border-radius: $corner-radius;
		background: $gray-95;
		cursor: pointer;
		transition: all 0.2s ease;

		&:hover:not(.loading):not(.error) {
			border-color: $gray-70;
			background: $gray-90;
		}

		&.loading {
			cursor: default;
		}

		&.error {
			border-color: $red-60;
			background: #fee;
			cursor: default;
		}
	}

	.placeholder-icon {
		width: $unit-4x;
		height: $unit-4x;
		color: $gray-50;
	}

	.error .placeholder-icon {
		color: $red-60;
	}

	.placeholder-text {
		font-size: $font-size-small;
		color: $gray-30;
	}

	.error-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: $unit-half;
	}

	.retry-button {
		padding: $unit-half $unit-2x;
		background: transparent;
		color: $red-60;
		border: 1px solid $red-60;
		border-radius: $corner-radius-xs;
		font-size: $font-size-extra-small;
		cursor: pointer;
		transition: all 0.2s;

		&:hover {
			background: $red-60;
			color: $white;
		}
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
</style>
