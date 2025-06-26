<script lang="ts">
	import { type Editor } from '@tiptap/core'
	import { onMount, setContext } from 'svelte'
	import { initiateEditor } from '$lib/components/edra/editor.ts'
	import { getEditorExtensions, EDITOR_PRESETS } from '$lib/components/edra/editor-extensions.js'
	import LoaderCircle from 'lucide-svelte/icons/loader-circle'
	import LinkMenu from '$lib/components/edra/headless/menus/link-menu.svelte'
	import TableRowMenu from '$lib/components/edra/headless/menus/table/table-row-menu.svelte'
	import TableColMenu from '$lib/components/edra/headless/menus/table/table-col-menu.svelte'
	import DragHandle from '$lib/components/edra/drag-handle.svelte'
	import EnhancedImagePlaceholder from '$lib/components/edra/headless/components/EnhancedImagePlaceholder.svelte'
	import UnifiedMediaModal from '../UnifiedMediaModal.svelte'
	import { mediaSelectionStore } from '$lib/stores/media-selection'
	import type { Media } from '@prisma/client'
	
	// Import new components
	import ComposerToolbar from './ComposerToolbar.svelte'
	import TextStyleDropdown from './TextStyleDropdown.svelte'
	import MediaInsertDropdown from './MediaInsertDropdown.svelte'
	import ComposerLinkManager from './ComposerLinkManager.svelte'
	import { ComposerMediaHandler } from './ComposerMediaHandler.svelte'
	import { useComposerEvents } from './useComposerEvents.svelte'
	import { useDropdown } from './useDropdown.svelte'
	import type { ComposerProps } from './types'
	import {
		getCurrentTextStyle,
		getFilteredCommands,
		getColorCommands,
		excludedCommands,
		getDefaultPlaceholder,
		getDefaultMinHeight,
		shouldShowToolbar,
		shouldShowSlashCommands,
		getDefaultFeatures
	} from './editorConfig'

	// Import Edra styles
	import '$lib/components/edra/headless/style.css'
	import 'katex/dist/katex.min.css'
	import '$lib/components/edra/editor.css'
	import '$lib/components/edra/onedark.css'

	let {
		variant = 'full',
		data = $bindable({
			type: 'doc',
			content: [{ type: 'paragraph' }]
		}),
		onChange,
		onCharacterCount,
		placeholder = getDefaultPlaceholder(variant),
		minHeight = getDefaultMinHeight(variant),
		autofocus = false,
		editable = true,
		class: className = '',
		showToolbar = shouldShowToolbar(variant),
		showSlashCommands = shouldShowSlashCommands(variant),
		albumId,
		features = getDefaultFeatures(variant)
	}: ComposerProps = $props()

	// Set editor context
	setContext('editorContext', {
		albumId,
		contentType: albumId ? 'album' : 'default',
		isAlbumEditor: !!albumId
	})

	// Core state
	let editor = $state<Editor | undefined>()
	let element = $state<HTMLElement>()
	let isLoading = $state(true)
	let initialized = false
	const mediaSelectionState = $derived($mediaSelectionStore)

	// Toolbar component ref
	let toolbarRef = $state<ComposerToolbar>()

	// Link manager ref
	let linkManagerRef = $state<ComposerLinkManager>()

	// Media handler
	let mediaHandler = $state<ComposerMediaHandler>()

	// Command configuration
	const filteredCommands = getFilteredCommands(variant, features)
	const colorCommands = getColorCommands()
	const currentTextStyle = $derived(editor ? getCurrentTextStyle(editor) : 'Paragraph')

	// Dropdown states
	let showTextStyleDropdown = $state(false)
	let showMediaDropdown = $state(false)

	// Text style dropdown
	const textStyleDropdown = $derived.by(() => {
		return useDropdown({
			triggerRef: toolbarRef?.getDropdownRefs()?.textStyle,
			isOpen: showTextStyleDropdown,
			onClose: () => (showTextStyleDropdown = false),
			portalClass: 'dropdown-menu-portal'
		})
	})

	// Media dropdown
	const mediaDropdown = $derived.by(() => {
		return useDropdown({
			triggerRef: toolbarRef?.getDropdownRefs()?.media,
			isOpen: showMediaDropdown,
			onClose: () => (showMediaDropdown = false),
			portalClass: 'media-dropdown-portal'
		})
	})

	// Event handlers
	const eventHandlers = useComposerEvents({
		editor,
		mediaHandler,
		features
	})

	// Media selection handlers
	function handleGlobalMediaSelect(media: Media) {
		mediaHandler?.handleMediaSelect(media)
		mediaSelectionStore.close()
	}

	function handleGlobalMediaClose() {
		mediaHandler?.handleMediaClose()
		mediaSelectionStore.close()
	}

	function handleOpenMediaLibrary() {
		mediaSelectionStore.open({
			mode: 'single',
			fileType: 'image',
			albumId,
			onSelect: handleGlobalMediaSelect,
			onClose: handleGlobalMediaClose
		})
	}

	// Update content when editor changes
	function handleUpdate({ editor: updatedEditor, transaction }: any) {
		// Skip the first update to avoid circular updates
		if (!initialized) {
			initialized = true
			return
		}

		// Dismiss link menus on typing
		linkManagerRef?.dismissOnTyping(transaction)

		const json = updatedEditor.getJSON()
		data = json
		onChange?.(json)

		// Calculate character count if callback provided
		if (onCharacterCount) {
			const text = updatedEditor.getText()
			onCharacterCount(text.length)
		}
	}

	// Simple effect to load content once when editor is ready
	let contentLoaded = false;
	$effect(() => {
		if (editor && data && !contentLoaded) {
			// Check if the data has actual content (not just empty doc)
			const hasContent = data.content && data.content.length > 0 && 
				!(data.content.length === 1 && data.content[0].type === 'paragraph' && !data.content[0].content);
			
			if (hasContent) {
				// Set the content once
				editor.commands.setContent(data);
				contentLoaded = true;
			}
		}
	});

	onMount(() => {
		// Get extensions with custom options
		const extensions = getEditorExtensions({
			showSlashCommands,
			onShowUrlConvertDropdown: features.urlEmbed ? linkManagerRef?.handleShowUrlConvertDropdown : undefined,
			onShowLinkContextMenu: linkManagerRef?.handleShowLinkContextMenu,
			imagePlaceholderComponent: EnhancedImagePlaceholder
		})

		// Initialize editor
		const newEditor = initiateEditor(
			element,
			data, // content
			undefined, // limit
			extensions,
			{
				onCreate: () => {
					isLoading = false
				},
				onUpdate: handleUpdate,
				editable,
				autofocus,
				editorProps: {
					handlePaste: eventHandlers.handlePaste,
					handleDrop: eventHandlers.handleDrop
				}
			},
			placeholder
		)

		editor = newEditor

		// Initialize media handler
		mediaHandler = new ComposerMediaHandler({
			editor: newEditor,
			albumId,
			features
		})

		// Initialize editor storage for image modal
		newEditor.storage.imageModal = { placeholderPos: undefined }

		return () => {
			newEditor.destroy()
		}
	})

	// Export public methods
	export function focus() {
		editor?.commands.focus()
	}

	export function blur() {
		editor?.commands.blur()
	}

	export function clear() {
		editor?.commands.clearContent()
	}

	export function isEmpty() {
		return editor?.isEmpty || true
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
		<ComposerToolbar
			bind:this={toolbarRef}
			{editor}
			{variant}
			{currentTextStyle}
			{filteredCommands}
			{colorCommands}
			{excludedCommands}
			showMediaLibrary={!!features.mediaLibrary}
			onTextStyleDropdownToggle={() => {
				showTextStyleDropdown = !showTextStyleDropdown
				textStyleDropdown?.toggle()
			}}
			onMediaDropdownToggle={() => {
				showMediaDropdown = !showMediaDropdown
				mediaDropdown?.toggle()
			}}
		/>
	{/if}

	{#if editor}
		<LinkMenu {editor} />
		{#if features.tables}
			<TableRowMenu {editor} />
			<TableColMenu {editor} />
		{/if}
		<ComposerLinkManager bind:this={linkManagerRef} {editor} {features} />
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
		onclick={eventHandlers.handleEditorClick}
		onkeydown={eventHandlers.handleEditorKeydown}
		class="edra-editor"
		class:with-toolbar={showToolbar}
		style={`min-height: ${minHeight}px`}
	></div>

	{#if editor}
		<DragHandle {editor} />
	{/if}
</div>

<!-- Text Style Dropdown -->
{#if showTextStyleDropdown && editor}
	<TextStyleDropdown
		{editor}
		position={textStyleDropdown?.position() || { top: 0, left: 0 }}
		{features}
		onDismiss={() => (showTextStyleDropdown = false)}
	/>
{/if}

<!-- Media Insert Dropdown -->
{#if showMediaDropdown && editor && features.mediaLibrary}
	<MediaInsertDropdown
		{editor}
		position={mediaDropdown?.position() || { top: 0, left: 0 }}
		{features}
		{albumId}
		onDismiss={() => (showMediaDropdown = false)}
		onOpenMediaLibrary={handleOpenMediaLibrary}
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
	@import '$styles/variables';
	@import '$styles/mixins';

	.composer {
		width: 100%;
		min-width: 0;
		display: flex;
		flex-direction: column;
		height: 100%;
		position: relative;
	}

	.edra-editor {
		flex: 1;
		width: 100%;
		padding: $unit-4x 0;
		min-height: 100px;
		outline: none;
		overflow-y: auto;

		&.with-toolbar {
			border-top: none;
		}

		// More generous padding for full variant
		.composer--full & {
			padding: $unit-4x 0;
			
			@include breakpoint('phone') {
				padding: $unit-3x 0;
			}
		}
	}

	.edra-loading {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: $unit;
		padding: $unit-4x;
		color: $gray-50;
		font-size: 14px;
	}

	// Variant-specific styles
	.composer--minimal {
		.edra-editor {
			padding: $unit;
			min-height: 60px;
			font-size: 14px;
		}
	}

	.composer--inline {
		.edra-editor {
			padding: $unit-2x;
			min-height: 80px;
		}
	}

	.composer--full {
		background: transparent;
		overflow: hidden;
	}
</style>