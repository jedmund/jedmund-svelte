<script lang="ts">
	import { type Editor } from '@tiptap/core'
	import { onMount, setContext } from 'svelte'
	import { initiateEditor } from '$lib/components/edra/editor.ts'
	import { getEditorExtensions, EDITOR_PRESETS } from '$lib/components/edra/editor-extensions.js'
	import { EdraToolbar, EdraBubbleMenu } from '$lib/components/edra/headless/index.js'
	import LoaderCircle from 'lucide-svelte/icons/loader-circle'
	import { focusEditor, type EdraProps } from '$lib/components/edra/utils.js'
	import EdraToolBarIcon from '$lib/components/edra/headless/components/EdraToolBarIcon.svelte'
	import { commands } from '$lib/components/edra/commands/commands.js'
	import EnhancedImagePlaceholder from '$lib/components/edra/headless/components/EnhancedImagePlaceholder.svelte'
	import type { JSONContent } from '@tiptap/core'

	// Import Edra styles
	import '$lib/components/edra/headless/style.css'
	import 'katex/dist/katex.min.css'
	import '$lib/components/edra/editor.css'
	import '$lib/components/edra/onedark.css'

	// Import menus
	import LinkMenu from '$lib/components/edra/headless/menus/link-menu.svelte'
	import TableRowMenu from '$lib/components/edra/headless/menus/table/table-row-menu.svelte'
	import TableColMenu from '$lib/components/edra/headless/menus/table/table-col-menu.svelte'
	import UrlConvertDropdown from '$lib/components/edra/headless/components/UrlConvertDropdown.svelte'
	import LinkContextMenuComponent from '$lib/components/edra/headless/components/LinkContextMenu.svelte'
	import LinkEditDialog from '$lib/components/edra/headless/components/LinkEditDialog.svelte'
	import UnifiedMediaModal from './UnifiedMediaModal.svelte'
	import { mediaSelectionStore } from '$lib/stores/media-selection'
	import type { Media } from '@prisma/client'

	// Component types
	type ComposerVariant = 'full' | 'inline' | 'minimal'

	interface Props {
		variant?: ComposerVariant
		data?: JSONContent
		onChange?: (content: JSONContent) => void
		onCharacterCount?: (count: number) => void
		placeholder?: string
		minHeight?: number
		autofocus?: boolean
		editable?: boolean
		class?: string
		showToolbar?: boolean
		showSlashCommands?: boolean
		albumId?: number
		features?: {
			imageUpload?: boolean
			mediaLibrary?: boolean
			urlEmbed?: boolean
			tables?: boolean
			codeBlocks?: boolean
		}
	}

	let {
		variant = 'full',
		data = $bindable({
			type: 'doc',
			content: [{ type: 'paragraph' }]
		}),
		onChange,
		onCharacterCount,
		placeholder = variant === 'inline' ? "What's on your mind?" : 'Type "/" for commands...',
		minHeight = variant === 'inline' ? 80 : 400,
		autofocus = false,
		editable = true,
		class: className = '',
		showToolbar = variant === 'full',
		showSlashCommands = variant !== 'minimal',
		albumId,
		features = {
			imageUpload: true,
			mediaLibrary: true,
			urlEmbed: true,
			tables: true,
			codeBlocks: true
		}
	}: Props = $props()

	// Set editor context for child components
	setContext('editorContext', {
		albumId,
		contentType: albumId ? 'album' : 'default',
		isAlbumEditor: !!albumId
	})

	// State
	let editor = $state<Editor | undefined>()
	let element = $state<HTMLElement>()
	let isLoading = $state(true)
	let initialized = false
	const mediaSelectionState = $derived($mediaSelectionStore)

	// Dropdown states
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

	// Get filtered commands based on variant and features
	const getFilteredCommands = () => {
		const filtered = { ...commands }

		// Remove groups based on variant
		if (variant === 'minimal') {
			delete filtered['undo-redo']
			delete filtered['headings']
			delete filtered['lists']
			delete filtered['alignment']
			delete filtered['table']
			delete filtered['media']
			delete filtered['fonts']
		} else if (variant === 'inline') {
			delete filtered['undo-redo']
			delete filtered['headings']
			delete filtered['lists']
			delete filtered['alignment']
			delete filtered['table']
			delete filtered['media']
		} else {
			// Full variant - reorganize for toolbar
			delete filtered['undo-redo']
			delete filtered['headings'] // In text style dropdown
			delete filtered['lists'] // In text style dropdown
			delete filtered['alignment']
			delete filtered['table']
			delete filtered['media'] // In media dropdown
		}

		// Reorganize text formatting for toolbar
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

	// Get media commands, but filter out based on features
	const getMediaCommands = () => {
		if (!commands.media) return []

		let mediaCommands = [...commands.media.commands]

		// Filter based on features
		if (!features.urlEmbed) {
			mediaCommands = mediaCommands.filter((cmd) => cmd.name !== 'iframe-placeholder')
		}

		return mediaCommands
	}

	const filteredCommands = getFilteredCommands()
	const colorCommands = commands.colors?.commands || []
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

	// Derived state for current text style
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

	// URL convert handlers
	const handleShowUrlConvertDropdown = (pos: number, url: string) => {
		if (!editor) return
		const coords = editor.view.coordsAtPos(pos)
		urlConvertDropdownPosition = { x: coords.left, y: coords.bottom + 5 }
		urlConvertPos = pos
		showUrlConvertDropdown = true
	}

	const handleConvertToEmbed = () => {
		if (!editor || urlConvertPos === null) return
		editor.commands.convertLinkToEmbed(urlConvertPos)
		showUrlConvertDropdown = false
		urlConvertPos = null
	}

	// Link context menu handlers
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

	// Handle media selection from the global store
	function handleGlobalMediaSelect(media: Media | Media[]) {
		if (!editor) return

		const selectedMedia = Array.isArray(media) ? media[0] : media
		if (selectedMedia) {
			// Set a reasonable default width (max 600px)
			const displayWidth =
				selectedMedia.width && selectedMedia.width > 600 ? 600 : selectedMedia.width

			editor
				.chain()
				.focus()
				.insertContent({
					type: 'image',
					attrs: {
						src: selectedMedia.url,
						alt: selectedMedia.altText || '',
						title: selectedMedia.description || '',
						width: displayWidth,
						height: selectedMedia.height,
						align: 'center',
						mediaId: selectedMedia.id?.toString()
					}
				})
				.run()
		}

		// Close the modal
		mediaSelectionStore.close()

		// Remove the placeholder if it exists
		if (editor.storage.imageModal?.placeholderPos !== undefined) {
			const pos = editor.storage.imageModal.placeholderPos
			editor
				.chain()
				.focus()
				.deleteRange({ from: pos, to: pos + 1 })
				.run()
			editor.storage.imageModal.placeholderPos = undefined
		}
	}

	function handleGlobalMediaClose() {
		mediaSelectionStore.close()

		// Remove the placeholder if user cancelled
		if (editor && editor.storage.imageModal?.placeholderPos !== undefined) {
			const pos = editor.storage.imageModal.placeholderPos
			editor
				.chain()
				.focus()
				.deleteRange({ from: pos, to: pos + 1 })
				.run()
			editor.storage.imageModal.placeholderPos = undefined
		}
	}

	// Handle paste for images
	function handlePaste(view: any, event: ClipboardEvent) {
		const clipboardData = event.clipboardData
		if (!clipboardData) return false

		// Check for images first
		const imageItem = Array.from(clipboardData.items).find(
			(item) => item.type.indexOf('image') === 0
		)
		if (imageItem && features.imageUpload) {
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

			// Use editor commands to insert HTML content
			const editorInstance = (view as any).editor
			if (editorInstance) {
				editorInstance
					.chain()
					.focus()
					.insertContent(htmlData, { parseOptions: { preserveWhitespace: false } })
					.run()
			} else {
				// Fallback to plain text
				const { state, dispatch } = view
				const { selection } = state
				const transaction = state.tr.insertText(plainText, selection.from, selection.to)
				dispatch(transaction)
			}

			return true
		}

		return false
	}

	async function uploadImage(file: File) {
		if (!editor || !features.imageUpload) return

		// Create a placeholder while uploading
		const placeholderSrc = URL.createObjectURL(file)
		editor.commands.insertContent({
			type: 'image',
			attrs: {
				src: placeholderSrc,
				alt: '',
				title: '',
				mediaId: null
			}
		})

		try {
			const auth = localStorage.getItem('admin_auth')
			if (!auth) {
				throw new Error('Not authenticated')
			}

			const formData = new FormData()
			formData.append('file', file)

			// Add albumId if available
			if (albumId) {
				formData.append('albumId', albumId.toString())
			}

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
			const displayWidth = media.width && media.width > 600 ? 600 : media.width

			editor.commands.insertContent({
				type: 'image',
				attrs: {
					src: media.url,
					alt: media.filename || '',
					title: media.description || '',
					width: displayWidth,
					height: media.height,
					align: 'center',
					mediaId: media.id?.toString()
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

	// Update content when editor changes
	function handleUpdate({ editor: updatedEditor, transaction }: any) {
		// Skip the first update to avoid circular updates
		if (!initialized) {
			initialized = true
			return
		}

		// Dismiss URL convert dropdown if user types
		if (showUrlConvertDropdown && transaction.docChanged) {
			const hasTextChange = transaction.steps.some(
				(step: any) =>
					step.toJSON().stepType === 'replace' || step.toJSON().stepType === 'replaceAround'
			)
			if (hasTextChange) {
				showUrlConvertDropdown = false
				urlConvertPos = null
			}
		}

		const json = updatedEditor.getJSON()
		data = json
		onChange?.(json)

		// Calculate character count if callback provided
		if (onCharacterCount) {
			const text = updatedEditor.getText()
			onCharacterCount(text.length)
		}
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

	onMount(() => {
		// Get extensions with custom options
		const extensions = getEditorExtensions({
			showSlashCommands,
			onShowUrlConvertDropdown: features.urlEmbed ? handleShowUrlConvertDropdown : undefined,
			onShowLinkContextMenu: handleShowLinkContextMenu,
			imagePlaceholderComponent: EnhancedImagePlaceholder
		})

		// Initialize editor storage for image modal
		const newEditor = initiateEditor(
			element,
			data,
			undefined, // no character limit by default
			extensions,
			{
				editable,
				onUpdate: handleUpdate,
				editorProps: {
					attributes: {
						class: 'prose prose-sm max-w-none focus:outline-none'
					},
					handlePaste: features.imageUpload ? handlePaste : undefined
				}
			},
			placeholder
		)

		// Initialize storage for image modal
		newEditor.storage.imageModal = { autoOpen: false }

		editor = newEditor

		// Auto-focus if requested
		if (autofocus) {
			setTimeout(() => {
				newEditor.commands.focus()
			}, 100)
		}

		isLoading = false

		return () => editor?.destroy()
	})


	// Public API
	export function save(): JSONContent | null {
		return editor?.getJSON() || null
	}

	export function clear() {
		editor?.commands.clearContent()
	}

	export function focus() {
		editor?.commands.focus()
	}

	export function blur() {
		editor?.commands.blur()
	}

	export function getContent() {
		return editor?.getJSON()
	}

	export function getText() {
		return editor?.getText() || ''
	}
</script>

<div class={`composer composer--${variant} ${className}`}>
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

				{#if features.mediaLibrary}
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
				{/if}

				{#if colorCommands.length > 0}
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
				{/if}
			</div>
		</div>
	{/if}

	{#if editor}
		<LinkMenu {editor} />
		{#if features.tables}
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
		style={`min-height: ${minHeight}px`}
	></div>
</div>

<!-- Media Dropdown Portal -->
{#if showMediaDropdown && features.mediaLibrary}
	<div
		class="media-dropdown-portal"
		style="position: fixed; top: {mediaDropdownPosition.top}px; left: {mediaDropdownPosition.left}px; z-index: 10000;"
	>
		<div class="dropdown-menu">
			<button
				class="dropdown-item"
				onclick={() => {
					if (editor) {
						// Get current position before inserting placeholder
						const pos = editor.state.selection.anchor

						// Insert placeholder
						editor.chain().focus().insertImagePlaceholder().run()

						// Store the position for later deletion
						editor.storage.imageModal = { placeholderPos: pos }

						// Open the modal through the store
						mediaSelectionStore.open({
							mode: 'single',
							fileType: 'image',
							albumId,
							onSelect: handleGlobalMediaSelect,
							onClose: handleGlobalMediaClose
						})
					}
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
					editor?.chain().focus().insertGeolocationPlaceholder().run()
					showMediaDropdown = false
				}}
			>
				Location
			</button>
			{#if features.urlEmbed}
				<button
					class="dropdown-item"
					onclick={() => {
						editor?.chain().focus().insertUrlEmbedPlaceholder().run()
						showMediaDropdown = false
					}}
				>
					Link
				</button>
			{/if}
		</div>
	</div>
{/if}

<!-- Text Style Dropdown Menu Portal -->
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
			{#if features.codeBlocks}
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
			{/if}
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
{#if showUrlConvertDropdown && features.urlEmbed}
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
		onConvertToCard={features.urlEmbed ? handleConvertLinkToEmbed : undefined}
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

<!-- Global Media Selection Modal -->
{#if mediaSelectionState.isOpen}
	<UnifiedMediaModal
		bind:isOpen={mediaSelectionState.isOpen}
		mode={mediaSelectionState.mode}
		fileType={mediaSelectionState.fileType}
		albumId={mediaSelectionState.albumId}
		onSelect={mediaSelectionState.onSelect}
		onClose={mediaSelectionState.onClose}
	/>
{/if}

<style lang="scss">
	@import '$styles/variables.scss';

	.composer {
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

	.composer--full .editor-toolbar {
		border-radius: 999px;
		border: 1px solid rgba(0, 0, 0, 0.08);
		box-shadow: 0 0 16px rgba(0, 0, 0, 0.12);
		background: $grey-95;
	}

	.edra-editor {
		width: 100%;
		flex: 1;
		min-width: 0;
		overflow: visible;
		box-sizing: border-box;
		padding: 0 $unit-4x;
		overflow-y: auto;
	}

	.composer--full .edra-editor :global(.ProseMirror) {
		min-height: 400px;
		padding: $unit-4x 0;
	}

	.composer--inline .edra-editor :global(.ProseMirror) {
		min-height: 80px;
		padding: $unit-2x 0;
	}

	.composer--minimal .edra-editor :global(.ProseMirror) {
		min-height: 60px;
		padding: $unit-2x 0;
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

	.edra-loading {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: $unit-4x;
		gap: $unit;
		color: $grey-30;
	}

	:global(.animate-spin) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>
