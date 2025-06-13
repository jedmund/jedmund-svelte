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
					.insertContentAt(
						{ from: pos, to: pos + node.nodeSize },
						[
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
						]
					)
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
				<button onclick={() => { showInput = true; error = false; }} class="retry-button">
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
	.edra-url-embed-placeholder-wrapper {
		margin: 1rem 0;
	}

	.url-input-container {
		display: flex;
		gap: 0.5rem;
		padding: 1rem;
		background: var(--grey-95, #f8f9fa);
		border: 2px solid var(--grey-85, #e9ecef);
		border-radius: 8px;
	}

	.url-input {
		flex: 1;
		padding: 0.5rem 1rem;
		border: 1px solid var(--grey-80, #dee2e6);
		border-radius: 6px;
		font-size: 0.875rem;
		background: white;
		
		&:focus {
			outline: none;
			border-color: var(--primary-color, #3b82f6);
		}
	}

	.submit-button {
		padding: 0.5rem 1rem;
		background: var(--primary-color, #3b82f6);
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;

		&:hover:not(:disabled) {
			background: var(--primary-hover, #2563eb);
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
		gap: 0.5rem;
		padding: 2rem;
		border: 2px dashed var(--grey-80, #dee2e6);
		border-radius: 8px;
		background: var(--grey-95, #f8f9fa);
		cursor: pointer;
		transition: all 0.2s ease;

		&:hover:not(.loading):not(.error) {
			border-color: var(--grey-60, #adb5bd);
			background: var(--grey-90, #e9ecef);
		}

		&.loading {
			cursor: default;
		}

		&.error {
			border-color: var(--red-60, #dc3545);
			background: #fee;
			cursor: default;
		}
	}

	.placeholder-icon {
		width: 32px;
		height: 32px;
		color: var(--grey-50, #6c757d);
	}

	.error .placeholder-icon {
		color: var(--red-60, #dc3545);
	}

	.placeholder-text {
		font-size: 0.875rem;
		color: var(--grey-30, #495057);
	}

	.error-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.retry-button {
		padding: 0.25rem 0.75rem;
		background: transparent;
		color: var(--red-60, #dc3545);
		border: 1px solid var(--red-60, #dc3545);
		border-radius: 4px;
		font-size: 0.75rem;
		cursor: pointer;
		transition: all 0.2s;

		&:hover {
			background: var(--red-60, #dc3545);
			color: white;
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