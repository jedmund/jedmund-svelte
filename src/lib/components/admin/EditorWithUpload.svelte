<script lang="ts">
	import { type Editor } from '@tiptap/core'
	import { onMount } from 'svelte'
	import { initiateEditor } from '$lib/components/edra/editor.js'
	import { EdraToolbar, EdraBubbleMenu } from '$lib/components/edra/headless/index.js'
	import LoaderCircle from 'lucide-svelte/icons/loader-circle'
	import { focusEditor, type EdraProps } from '$lib/components/edra/utils.js'
	
	// Import all the same components as Edra
	import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
	import { all, createLowlight } from 'lowlight'
	import { SvelteNodeViewRenderer } from 'svelte-tiptap'
	import CodeExtended from '$lib/components/edra/headless/components/CodeExtended.svelte'
	import { AudioPlaceholder } from '$lib/components/edra/extensions/audio/AudioPlaceholder.js'
	import AudioPlaceholderComponent from '$lib/components/edra/headless/components/AudioPlaceholder.svelte'
	import AudioExtendedComponent from '$lib/components/edra/headless/components/AudioExtended.svelte'
	import { ImagePlaceholder } from '$lib/components/edra/extensions/image/ImagePlaceholder.js'
	import ImageUploadPlaceholder from './ImageUploadPlaceholder.svelte' // Our custom component
	import { VideoPlaceholder } from '$lib/components/edra/extensions/video/VideoPlaceholder.js'
	import VideoPlaceholderComponent from '$lib/components/edra/headless/components/VideoPlaceholder.svelte'
	import { ImageExtended } from '$lib/components/edra/extensions/image/ImageExtended.js'
	import ImageExtendedComponent from '$lib/components/edra/headless/components/ImageExtended.svelte'
	import VideoExtendedComponent from '$lib/components/edra/headless/components/VideoExtended.svelte'
	import { VideoExtended } from '$lib/components/edra/extensions/video/VideoExtended.js'
	import { AudioExtended } from '$lib/components/edra/extensions/audio/AudiExtended.js'
	import LinkMenu from '$lib/components/edra/headless/menus/link-menu.svelte'
	import TableRowMenu from '$lib/components/edra/headless/menus/table/table-row-menu.svelte'
	import TableColMenu from '$lib/components/edra/headless/menus/table/table-col-menu.svelte'
	import slashcommand from '$lib/components/edra/extensions/slash-command/slashcommand.js'
	import SlashCommandList from '$lib/components/edra/headless/components/SlashCommandList.svelte'
	import IFramePlaceholderComponent from '$lib/components/edra/headless/components/IFramePlaceholder.svelte'
	import { IFramePlaceholder } from '$lib/components/edra/extensions/iframe/IFramePlaceholder.js'
	import { IFrameExtended } from '$lib/components/edra/extensions/iframe/IFrameExtended.js'
	import IFrameExtendedComponent from '$lib/components/edra/headless/components/IFrameExtended.svelte'
	
	// Import Edra styles
	import '$lib/components/edra/headless/style.css'
	import 'katex/dist/katex.min.css'
	import '$lib/components/edra/editor.css'
	import '$lib/components/edra/onedark.css'
	
	const lowlight = createLowlight(all)
	
	let {
		class: className = '',
		content = undefined,
		editable = true,
		limit = undefined,
		editor = $bindable<Editor | undefined>(),
		showSlashCommands = true,
		showLinkBubbleMenu = true,
		showTableBubbleMenu = true,
		onUpdate,
		showToolbar = true,
		placeholder = 'Type "/" for commands...'
	}: EdraProps & { showToolbar?: boolean; placeholder?: string } = $props()
	
	let element = $state<HTMLElement>()
	let isLoading = $state(true)
	
	// Custom image paste handler
	function handleImagePaste(view: any, event: ClipboardEvent) {
		const item = event.clipboardData?.items[0]
		
		if (item?.type.indexOf('image') !== 0) {
			return false
		}
		
		const file = item.getAsFile()
		if (!file) return false
		
		// Check file size (2MB max)
		const filesize = file.size / 1024 / 1024
		if (filesize > 2) {
			alert(`Image too large! File size: ${filesize.toFixed(2)} MB (max 2MB)`)
			return true
		}
		
		// Upload to our media API
		uploadImage(file)
		
		return true // Prevent default paste behavior
	}
	
	async function uploadImage(file: File) {
		if (!editor) return
		
		// Create a placeholder while uploading
		const placeholderSrc = URL.createObjectURL(file)
		editor.commands.setImage({ src: placeholderSrc })
		
		try {
			const auth = localStorage.getItem('admin_auth')
			if (!auth) {
				throw new Error('Not authenticated')
			}
			
			const formData = new FormData()
			formData.append('file', file)
			
			const response = await fetch('/api/media/upload', {
				method: 'POST',
				headers: {
					Authorization: `Basic ${auth}`
				},
				body: formData
			})
			
			if (!response.ok) {
				throw new Error('Upload failed')
			}
			
			const media = await response.json()
			
			// Replace placeholder with actual URL
			// Set a reasonable default width (max 600px)
			const displayWidth = media.width && media.width > 600 ? 600 : media.width
			
			editor.commands.insertContent({
				type: 'image',
				attrs: {
					src: media.url,
					alt: media.filename || '',
					width: displayWidth,
					height: media.height,
					align: 'center'
				}
			})
			
			// Clean up the object URL
			URL.revokeObjectURL(placeholderSrc)
		} catch (error) {
			console.error('Image upload failed:', error)
			alert('Failed to upload image. Please try again.')
			// Remove the placeholder on error
			editor.commands.undo()
		}
	}
	
	onMount(() => {
		editor = initiateEditor(
			element,
			content,
			limit,
			[
				CodeBlockLowlight.configure({
					lowlight
				}).extend({
					addNodeView() {
						return SvelteNodeViewRenderer(CodeExtended)
					}
				}),
				AudioPlaceholder(AudioPlaceholderComponent),
				ImagePlaceholder(ImageUploadPlaceholder), // Use our custom component
				IFramePlaceholder(IFramePlaceholderComponent),
				IFrameExtended(IFrameExtendedComponent),
				VideoPlaceholder(VideoPlaceholderComponent),
				AudioExtended(AudioExtendedComponent),
				ImageExtended(ImageExtendedComponent),
				VideoExtended(VideoExtendedComponent),
				...(showSlashCommands ? [slashcommand(SlashCommandList)] : [])
			],
			{
				editable,
				onUpdate,
				onTransaction: (props) => {
					editor = undefined
					editor = props.editor
				},
				editorProps: {
					attributes: {
						class: 'prose prose-sm max-w-none focus:outline-none'
					},
					handlePaste: handleImagePaste
				}
			}
		)
		
		// Add placeholder
		if (placeholder && editor) {
			editor.extensionManager.extensions.find(
				ext => ext.name === 'placeholder'
			)?.configure({
				placeholder
			})
		}
		
		isLoading = false
		
		return () => editor?.destroy()
	})
</script>

<div class={`edra ${className}`}>
	{#if showToolbar && editor && !isLoading}
		<div class="editor-toolbar">
			<EdraToolbar {editor} />
		</div>
	{/if}
	{#if editor}
		{#if showLinkBubbleMenu}
			<LinkMenu {editor} />
		{/if}
		{#if showTableBubbleMenu}
			<TableRowMenu {editor} />
			<TableColMenu {editor} />
		{/if}
	{/if}
	{#if !editor}
		<div class="edra-loading">
			<LoaderCircle class="animate-spin" /> Loading...
		</div>
	{/if}
	<div
		bind:this={element}
		role="button"
		tabindex="0"
		onclick={(event) => focusEditor(editor, event)}
		onkeydown={(event) => {
			if (event.key === 'Enter' || event.key === ' ') {
				focusEditor(editor, event)
			}
		}}
		class="edra-editor"
	></div>
</div>

<style>
	.edra {
		width: 100%;
		min-width: 0;
		display: flex;
		flex-direction: column;
		height: 100%;
	}
	
	.editor-toolbar {
		border-bottom: 1px solid var(--edra-border-color);
		background: var(--edra-button-bg-color);
		padding: 0.5rem;
		position: sticky;
		top: 0;
		z-index: 10;
		overflow-x: auto;
		overflow-y: hidden;
		white-space: nowrap;
		-webkit-overflow-scrolling: touch;
		width: 100%;
		flex-shrink: 0;
	}
	
	.edra-editor {
		width: 100%;
		flex: 1;
		min-width: 0;
		overflow-x: hidden;
	}
	
	:global(.ProseMirror) {
		width: 100%;
		min-height: 100%;
		position: relative;
		word-wrap: break-word;
		white-space: pre-wrap;
		cursor: auto;
		-webkit-font-variant-ligatures: none;
		font-variant-ligatures: none;
		&:focus {
			outline: none;
		}
	}
</style>