<script lang="ts">
	import { type Editor } from '@tiptap/core'
	import { onMount } from 'svelte'
	import { initiateEditor } from '$lib/components/edra/editor.js'
	import { EdraToolbar, EdraBubbleMenu } from '$lib/components/edra/headless/index.js'
	import LoaderCircle from 'lucide-svelte/icons/loader-circle'
	import { focusEditor, type EdraProps } from '$lib/components/edra/utils.js'
	import EdraToolBarIcon from '$lib/components/edra/headless/components/EdraToolBarIcon.svelte'
	import { commands } from '$lib/components/edra/commands/commands.js'

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
	import { GalleryPlaceholder } from '$lib/components/edra/extensions/gallery/GalleryPlaceholder.js'
	import GalleryPlaceholderComponent from '$lib/components/edra/headless/components/GalleryPlaceholder.svelte'
	import { GalleryExtended } from '$lib/components/edra/extensions/gallery/GalleryExtended.js'
	import GalleryExtendedComponent from '$lib/components/edra/headless/components/GalleryExtended.svelte'
	import { UrlEmbed } from '$lib/components/edra/extensions/url-embed/UrlEmbed.js'
	import { UrlEmbedPlaceholder } from '$lib/components/edra/extensions/url-embed/UrlEmbedPlaceholder.js'
	import UrlEmbedPlaceholderComponent from '$lib/components/edra/headless/components/UrlEmbedPlaceholder.svelte'
	import { UrlEmbedExtended } from '$lib/components/edra/extensions/url-embed/UrlEmbedExtended.js'
	import UrlEmbedExtendedComponent from '$lib/components/edra/headless/components/UrlEmbedExtended.svelte'
	import { LinkContextMenu } from '$lib/components/edra/extensions/link-context-menu/LinkContextMenu.js'
	import UrlConvertDropdown from '$lib/components/edra/headless/components/UrlConvertDropdown.svelte'
	import LinkContextMenuComponent from '$lib/components/edra/headless/components/LinkContextMenu.svelte'
	import LinkEditDialog from '$lib/components/edra/headless/components/LinkEditDialog.svelte'

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
		placeholder = 'Type "/" for commands...',
		onEditorReady
	}: EdraProps & {
		showToolbar?: boolean
		placeholder?: string
		onEditorReady?: (editor: Editor) => void
	} = $props()

	let element = $state<HTMLElement>()
	let isLoading = $state(true)
	let showTextStyleDropdown = $state(false)
	let showMediaDropdown = $state(false)
	let dropdownTriggerRef = $state<HTMLElement>()
	let mediaDropdownTriggerRef = $state<HTMLElement>()
	let dropdownPosition = $state({ top: 0, left: 0 })
	let mediaDropdownPosition = $state({ top: 0, left: 0 })

	// URL convert dropdown state
	let showUrlConvertDropdown = $state(false)
	let urlConvertDropdownPosition = $state({ x: 0, y: 0 })
	let urlConvertPos = $state<number | null>(null)

	// Link context menu state
	let showLinkContextMenu = $state(false)
	let linkContextMenuPosition = $state({ x: 0, y: 0 })
	let linkContextUrl = $state<string | null>(null)
	let linkContextPos = $state<number | null>(null)

	// Link edit dialog state
	let showLinkEditDialog = $state(false)
	let linkEditDialogPosition = $state({ x: 0, y: 0 })
	let linkEditUrl = $state<string>('')
	let linkEditPos = $state<number | null>(null)

	// Filter out unwanted commands
	const getFilteredCommands = () => {
		const filtered = { ...commands }

		// Remove these groups entirely
		delete filtered['undo-redo']
		delete filtered['headings'] // In text style dropdown
		delete filtered['lists'] // In text style dropdown
		delete filtered['alignment'] // Not needed
		delete filtered['table'] // Not needed
		delete filtered['media'] // Will be in media dropdown

		// Reorganize text-formatting commands
		if (filtered['text-formatting']) {
			const allCommands = filtered['text-formatting'].commands
			const basicFormatting = []
			const advancedFormatting = []

			// Group basic formatting first
			const basicOrder = ['bold', 'italic', 'underline', 'strike']
			basicOrder.forEach((name) => {
				const cmd = allCommands.find((c) => c.name === name)
				if (cmd) basicFormatting.push(cmd)
			})

			// Then link and code
			const advancedOrder = ['link', 'code']
			advancedOrder.forEach((name) => {
				const cmd = allCommands.find((c) => c.name === name)
				if (cmd) advancedFormatting.push(cmd)
			})

			// Create two groups
			filtered['basic-formatting'] = {
				name: 'Basic Formatting',
				label: 'Basic Formatting',
				commands: basicFormatting
			}

			filtered['advanced-formatting'] = {
				name: 'Advanced Formatting',
				label: 'Advanced Formatting',
				commands: advancedFormatting
			}

			// Remove original text-formatting
			delete filtered['text-formatting']
		}

		return filtered
	}

	// Get media commands, but filter out iframe
	const getMediaCommands = () => {
		if (commands.media) {
			return commands.media.commands.filter((cmd) => cmd.name !== 'iframe-placeholder')
		}
		return []
	}

	const filteredCommands = getFilteredCommands()
	const colorCommands = commands.colors.commands
	const fontCommands = commands.fonts.commands
	const excludedCommands = ['colors', 'fonts']

	// Get current text style for dropdown
	const getCurrentTextStyle = (editor: Editor) => {
		if (editor.isActive('heading', { level: 1 })) return 'Heading 1'
		if (editor.isActive('heading', { level: 2 })) return 'Heading 2'
		if (editor.isActive('heading', { level: 3 })) return 'Heading 3'
		if (editor.isActive('bulletList')) return 'Bullet List'
		if (editor.isActive('orderedList')) return 'Ordered List'
		if (editor.isActive('taskList')) return 'Task List'
		if (editor.isActive('codeBlock')) return 'Code Block'
		if (editor.isActive('blockquote')) return 'Blockquote'
		return 'Paragraph'
	}

	// Derived state for current text style to avoid reactive mutations
	let currentTextStyle = $derived(editor ? getCurrentTextStyle(editor) : 'Paragraph')

	// Calculate dropdown position
	const updateDropdownPosition = () => {
		if (dropdownTriggerRef) {
			const rect = dropdownTriggerRef.getBoundingClientRect()
			dropdownPosition = {
				top: rect.bottom + 4,
				left: rect.left
			}
		}
	}

	// Toggle dropdown with position update
	const toggleDropdown = () => {
		if (!showTextStyleDropdown) {
			updateDropdownPosition()
		}
		showTextStyleDropdown = !showTextStyleDropdown
	}

	// Update media dropdown position
	const updateMediaDropdownPosition = () => {
		if (mediaDropdownTriggerRef) {
			const rect = mediaDropdownTriggerRef.getBoundingClientRect()
			mediaDropdownPosition = {
				top: rect.bottom + 4,
				left: rect.left
			}
		}
	}

	// Toggle media dropdown
	const toggleMediaDropdown = () => {
		if (!showMediaDropdown) {
			updateMediaDropdownPosition()
		}
		showMediaDropdown = !showMediaDropdown
	}

	// Close dropdown when clicking outside
	const handleClickOutside = (event: MouseEvent) => {
		const target = event.target as HTMLElement
		if (!dropdownTriggerRef?.contains(target) && !target.closest('.dropdown-menu-portal')) {
			showTextStyleDropdown = false
		}
		if (!mediaDropdownTriggerRef?.contains(target) && !target.closest('.media-dropdown-portal')) {
			showMediaDropdown = false
		}
		if (!target.closest('.url-convert-dropdown')) {
			showUrlConvertDropdown = false
		}
		if (!target.closest('.link-context-menu')) {
			showLinkContextMenu = false
		}
		if (!target.closest('.link-edit-dialog')) {
			showLinkEditDialog = false
		}
	}

	// Handle URL convert dropdown
	const handleShowUrlConvertDropdown = (pos: number, url: string) => {
		if (!editor) return

		// Get the cursor coordinates
		const coords = editor.view.coordsAtPos(pos)
		urlConvertDropdownPosition = { x: coords.left, y: coords.bottom + 5 }
		urlConvertPos = pos
		showUrlConvertDropdown = true
	}

	// Handle link context menu
	const handleShowLinkContextMenu = (
		pos: number,
		url: string,
		coords: { x: number; y: number }
	) => {
		if (!editor) return

		linkContextMenuPosition = { x: coords.x, y: coords.y + 5 }
		linkContextUrl = url
		linkContextPos = pos
		showLinkContextMenu = true
	}

	const handleConvertToEmbed = () => {
		if (!editor || urlConvertPos === null) return

		editor.commands.convertLinkToEmbed(urlConvertPos)
		showUrlConvertDropdown = false
		urlConvertPos = null
	}

	const handleConvertLinkToEmbed = () => {
		if (!editor || linkContextPos === null) return

		editor.commands.convertLinkToEmbed(linkContextPos)
		showLinkContextMenu = false
		linkContextPos = null
		linkContextUrl = null
	}

	const handleEditLink = () => {
		if (!editor || !linkContextUrl) return

		linkEditUrl = linkContextUrl
		linkEditPos = linkContextPos
		linkEditDialogPosition = { ...linkContextMenuPosition }
		showLinkEditDialog = true
		showLinkContextMenu = false
	}

	const handleSaveLink = (newUrl: string) => {
		if (!editor) return

		editor.chain().focus().extendMarkRange('link').setLink({ href: newUrl }).run()
		showLinkEditDialog = false
		linkEditPos = null
		linkEditUrl = ''
	}

	const handleCopyLink = () => {
		if (!linkContextUrl) return

		navigator.clipboard.writeText(linkContextUrl)
		showLinkContextMenu = false
		linkContextPos = null
		linkContextUrl = null
	}

	const handleRemoveLink = () => {
		if (!editor) return

		editor.chain().focus().extendMarkRange('link').unsetLink().run()
		showLinkContextMenu = false
		linkContextPos = null
		linkContextUrl = null
	}

	const handleOpenLink = () => {
		if (!linkContextUrl) return

		window.open(linkContextUrl, '_blank', 'noopener,noreferrer')
		showLinkContextMenu = false
		linkContextPos = null
		linkContextUrl = null
	}

	$effect(() => {
		if (
			showTextStyleDropdown ||
			showMediaDropdown ||
			showUrlConvertDropdown ||
			showLinkContextMenu ||
			showLinkEditDialog
		) {
			document.addEventListener('click', handleClickOutside)
			return () => {
				document.removeEventListener('click', handleClickOutside)
			}
		}
	})

	// Custom paste handler for both images and text
	function handlePaste(view: any, event: ClipboardEvent) {
		const clipboardData = event.clipboardData
		if (!clipboardData) return false

		// Check for images first
		const imageItem = Array.from(clipboardData.items).find(
			(item) => item.type.indexOf('image') === 0
		)
		if (imageItem) {
			const file = imageItem.getAsFile()
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

		// Handle text paste - preserve links while stripping other formatting
		const htmlData = clipboardData.getData('text/html')
		const plainText = clipboardData.getData('text/plain')

		if (htmlData && plainText) {
			event.preventDefault()

			// Use editor commands to insert HTML content, but let Tiptap handle the parsing
			// This will preserve links while stripping unwanted formatting based on editor config
			const editorInstance = (view as any).editor
			if (editorInstance) {
				// Use pasteHTML to let Tiptap process the HTML and apply configured extensions
				editorInstance
					.chain()
					.focus()
					.insertContent(htmlData, { parseOptions: { preserveWhitespace: false } })
					.run()
			} else {
				// Fallback to plain text if editor instance not available
				const { state, dispatch } = view
				const { selection } = state
				const transaction = state.tr.insertText(plainText, selection.from, selection.to)
				dispatch(transaction)
			}

			return true // Prevent default paste behavior
		}

		// Let default handling take care of plain text only
		return false
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
		const newEditor = initiateEditor(
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
				GalleryPlaceholder(GalleryPlaceholderComponent),
				IFramePlaceholder(IFramePlaceholderComponent),
				IFrameExtended(IFrameExtendedComponent),
				VideoPlaceholder(VideoPlaceholderComponent),
				AudioExtended(AudioExtendedComponent),
				ImageExtended(ImageExtendedComponent),
				GalleryExtended(GalleryExtendedComponent),
				VideoExtended(VideoExtendedComponent),
				UrlEmbed.configure({
					onShowDropdown: handleShowUrlConvertDropdown
				}),
				UrlEmbedPlaceholder(UrlEmbedPlaceholderComponent),
				UrlEmbedExtended(UrlEmbedExtendedComponent),
				LinkContextMenu.configure({
					onShowContextMenu: handleShowLinkContextMenu
				}),
				...(showSlashCommands ? [slashcommand(SlashCommandList)] : [])
			],
			{
				editable,
				onUpdate: ({ editor: updatedEditor, transaction }) => {
					// Dismiss URL convert dropdown if user types
					if (showUrlConvertDropdown && transaction.docChanged) {
						// Check if the change is actual typing (not just cursor movement)
						const hasTextChange = transaction.steps.some(
							(step) =>
								step.toJSON().stepType === 'replace' || step.toJSON().stepType === 'replaceAround'
						)
						if (hasTextChange) {
							showUrlConvertDropdown = false
							urlConvertPos = null
						}
					}

					// Call the original onUpdate if provided
					if (onUpdate) {
						onUpdate({ editor: updatedEditor, transaction })
					}
				},
				editorProps: {
					attributes: {
						class: 'prose prose-sm max-w-none focus:outline-none'
					},
					handlePaste: handlePaste
				}
			},
			placeholder
		)
		editor = newEditor

		// Notify parent component that editor is ready
		if (onEditorReady) {
			onEditorReady(newEditor)
		}

		// Add placeholder
		if (placeholder && editor) {
			editor.extensionManager.extensions
				.find((ext) => ext.name === 'placeholder')
				?.configure({
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
			<div class="edra-toolbar">
				<!-- Text Style Dropdown -->
				<div class="text-style-dropdown">
					<button bind:this={dropdownTriggerRef} class="dropdown-trigger" onclick={toggleDropdown}>
						<span>{currentTextStyle}</span>
						<svg
							width="12"
							height="12"
							viewBox="0 0 12 12"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								d="M3 4.5L6 7.5L9 4.5"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</button>
				</div>

				<span class="separator"></span>

				{#each Object.keys(filteredCommands).filter((key) => !excludedCommands.includes(key)) as keys}
					{@const groups = filteredCommands[keys].commands}
					{#each groups as command}
						<EdraToolBarIcon {command} {editor} />
					{/each}
					<span class="separator"></span>
				{/each}

				<!-- Media Dropdown -->
				<div class="text-style-dropdown">
					<button
						bind:this={mediaDropdownTriggerRef}
						class="dropdown-trigger"
						onclick={toggleMediaDropdown}
					>
						<span>Insert</span>
						<svg
							width="12"
							height="12"
							viewBox="0 0 12 12"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								d="M3 4.5L6 7.5L9 4.5"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</button>
				</div>

				<span class="separator"></span>

				<EdraToolBarIcon
					command={colorCommands[0]}
					{editor}
					style={`color: ${editor.getAttributes('textStyle').color};`}
					onclick={() => {
						const color = editor.getAttributes('textStyle').color
						const hasColor = editor.isActive('textStyle', { color })
						if (hasColor) {
							editor.chain().focus().unsetColor().run()
						} else {
							const color = prompt('Enter the color of the text:')
							if (color !== null) {
								editor.chain().focus().setColor(color).run()
							}
						}
					}}
				/>
				<EdraToolBarIcon
					command={colorCommands[1]}
					{editor}
					style={`background-color: ${editor.getAttributes('highlight').color};`}
					onclick={() => {
						const hasHightlight = editor.isActive('highlight')
						if (hasHightlight) {
							editor.chain().focus().unsetHighlight().run()
						} else {
							const color = prompt('Enter the color of the highlight:')
							if (color !== null) {
								editor.chain().focus().setHighlight({ color }).run()
							}
						}
					}}
				/>
			</div>
		</div>
	{/if}
	{#if editor}
		{#if false && showLinkBubbleMenu}
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
		class:with-toolbar={showToolbar}
	></div>
</div>

<!-- Media Dropdown Portal -->
{#if showMediaDropdown}
	<div
		class="media-dropdown-portal"
		style="position: fixed; top: {mediaDropdownPosition.top}px; left: {mediaDropdownPosition.left}px; z-index: 10000;"
	>
		<div class="dropdown-menu">
			<button
				class="dropdown-item"
				onclick={() => {
					editor?.chain().focus().insertImagePlaceholder().run()
					showMediaDropdown = false
				}}
			>
				Image
			</button>
			<button
				class="dropdown-item"
				onclick={() => {
					editor?.chain().focus().insertGalleryPlaceholder().run()
					showMediaDropdown = false
				}}
			>
				Gallery
			</button>
			<button
				class="dropdown-item"
				onclick={() => {
					editor?.chain().focus().insertVideoPlaceholder().run()
					showMediaDropdown = false
				}}
			>
				Video
			</button>
			<button
				class="dropdown-item"
				onclick={() => {
					editor?.chain().focus().insertAudioPlaceholder().run()
					showMediaDropdown = false
				}}
			>
				Audio
			</button>
			<div class="dropdown-separator"></div>
			<button
				class="dropdown-item"
				onclick={() => {
					editor?.chain().focus().insertUrlEmbedPlaceholder().run()
					showMediaDropdown = false
				}}
			>
				Link
			</button>
		</div>
	</div>
{/if}

<!-- Dropdown Menu Portal -->
{#if showTextStyleDropdown}
	<div
		class="dropdown-menu-portal"
		style="position: fixed; top: {dropdownPosition.top}px; left: {dropdownPosition.left}px; z-index: 10000;"
	>
		<div class="dropdown-menu">
			<button
				class="dropdown-item"
				onclick={() => {
					editor?.chain().focus().setParagraph().run()
					showTextStyleDropdown = false
				}}
			>
				Paragraph
			</button>
			<div class="dropdown-separator"></div>
			<button
				class="dropdown-item"
				onclick={() => {
					editor?.chain().focus().toggleHeading({ level: 1 }).run()
					showTextStyleDropdown = false
				}}
			>
				Heading 1
			</button>
			<button
				class="dropdown-item"
				onclick={() => {
					editor?.chain().focus().toggleHeading({ level: 2 }).run()
					showTextStyleDropdown = false
				}}
			>
				Heading 2
			</button>
			<button
				class="dropdown-item"
				onclick={() => {
					editor?.chain().focus().toggleHeading({ level: 3 }).run()
					showTextStyleDropdown = false
				}}
			>
				Heading 3
			</button>
			<div class="dropdown-separator"></div>
			<button
				class="dropdown-item"
				onclick={() => {
					editor?.chain().focus().toggleBulletList().run()
					showTextStyleDropdown = false
				}}
			>
				Unordered List
			</button>
			<button
				class="dropdown-item"
				onclick={() => {
					editor?.chain().focus().toggleOrderedList().run()
					showTextStyleDropdown = false
				}}
			>
				Ordered List
			</button>
			<button
				class="dropdown-item"
				onclick={() => {
					editor?.chain().focus().toggleTaskList().run()
					showTextStyleDropdown = false
				}}
			>
				Task List
			</button>
			<div class="dropdown-separator"></div>
			<button
				class="dropdown-item"
				onclick={() => {
					editor?.chain().focus().toggleCodeBlock().run()
					showTextStyleDropdown = false
				}}
			>
				Code Block
			</button>
			<button
				class="dropdown-item"
				onclick={() => {
					editor?.chain().focus().toggleBlockquote().run()
					showTextStyleDropdown = false
				}}
			>
				Blockquote
			</button>
		</div>
	</div>
{/if}

<!-- URL Convert Dropdown -->
{#if showUrlConvertDropdown}
	<UrlConvertDropdown
		x={urlConvertDropdownPosition.x}
		y={urlConvertDropdownPosition.y}
		onConvert={handleConvertToEmbed}
		onDismiss={() => {
			showUrlConvertDropdown = false
			urlConvertPos = null
		}}
	/>
{/if}

<!-- Link Context Menu -->
{#if showLinkContextMenu && linkContextUrl}
	<LinkContextMenuComponent
		x={linkContextMenuPosition.x}
		y={linkContextMenuPosition.y}
		url={linkContextUrl}
		onConvertToCard={handleConvertLinkToEmbed}
		onEditLink={handleEditLink}
		onCopyLink={handleCopyLink}
		onRemoveLink={handleRemoveLink}
		onOpenLink={handleOpenLink}
		onDismiss={() => {
			showLinkContextMenu = false
			linkContextPos = null
			linkContextUrl = null
		}}
	/>
{/if}

<!-- Link Edit Dialog -->
{#if showLinkEditDialog}
	<LinkEditDialog
		x={linkEditDialogPosition.x}
		y={linkEditDialogPosition.y}
		currentUrl={linkEditUrl}
		onSave={handleSaveLink}
		onCancel={() => {
			showLinkEditDialog = false
			linkEditPos = null
			linkEditUrl = ''
		}}
	/>
{/if}

<style lang="scss">
	.edra {
		width: 100%;
		min-width: 0;
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.editor-toolbar {
		background: var(--edra-button-bg-color);
		box-sizing: border-box;
		padding: $unit ($unit-2x + $unit);
		position: sticky;
		box-sizing: border-box;
		top: 75px;
		z-index: 10;
		overflow-x: auto;
		overflow-y: hidden;
		white-space: nowrap;
		-webkit-overflow-scrolling: touch;
		width: 100%;
		flex-shrink: 0;
		backdrop-filter: blur(10px);
		background: rgba(255, 255, 255, 0.9);
	}

	.edra-editor {
		width: 100%;
		flex: 1;
		min-width: 0;
		overflow: visible;
		box-sizing: border-box;
	}

	// .edra-editor.with-toolbar {
	// 	padding-top: 52px; /* Account for sticky toolbar height */
	// }

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

	/* Text Style Dropdown Styles */
	.text-style-dropdown {
		position: relative;
		display: inline-block;
	}

	.dropdown-trigger {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 6px 12px;
		background: transparent;
		border: 1px solid transparent;
		border-radius: 8px;
		font-size: 14px;
		font-family: inherit;
		color: var(--edra-text-color);
		cursor: pointer;
		transition: all 0.2s ease;
		min-width: 120px;
		justify-content: space-between;
		height: 36px;
	}

	.dropdown-trigger:hover {
		background: rgba(0, 0, 0, 0.06);
		border-color: transparent;
	}

	.dropdown-menu {
		background: white;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		min-width: 160px;
		overflow: hidden;
	}

	.dropdown-item {
		display: block;
		width: 100%;
		padding: 8px 16px;
		text-align: left;
		background: none;
		border: none;
		font-size: 14px;
		font-family: inherit;
		color: var(--edra-text-color);
		cursor: pointer;
		transition: background-color 0.2s ease;
	}

	.dropdown-item:hover {
		background-color: #f5f5f5;
	}

	.dropdown-separator {
		height: 1px;
		background-color: #e0e0e0;
		margin: 4px 0;
	}

	/* Separator in toolbar */
	:global(.edra-toolbar .separator) {
		display: inline-block;
		width: 2px;
		height: 24px;
		background-color: #e0e0e0;
		border-radius: 1px;
		margin: 0 4px;
		vertical-align: middle;
	}

	/* Remove default button backgrounds */
	:global(.edra-toolbar button) {
		background: transparent;
		border: 1px solid transparent;
		border-radius: 6px;
		transition: all 0.2s ease;
	}

	:global(.edra-toolbar button:hover) {
		background: rgba(0, 0, 0, 0.06);
		border-color: transparent;
	}

	:global(.edra-toolbar button.active),
	:global(.edra-toolbar button[data-active='true']) {
		background: rgba(0, 0, 0, 0.1);
		border-color: transparent;
	}

	/* Thicker strokes for icons */
	:global(.edra-toolbar svg) {
		stroke-width: 2;
	}
</style>
