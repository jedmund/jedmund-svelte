import type { Editor } from '@tiptap/core'
import type { EditorView } from '@tiptap/pm/view'
import { Selection } from '@tiptap/pm/state'
import type { ComposerMediaHandler } from './ComposerMediaHandler.svelte'
import { focusEditor } from '$lib/components/edra/utils'

export interface UseComposerEventsOptions {
	editor: (() => Editor | undefined) | Editor | undefined
	mediaHandler: (() => ComposerMediaHandler | undefined) | ComposerMediaHandler | undefined
	features: {
		imageUpload?: boolean
	}
}

function resolve<T>(value: (() => T) | T): T {
	return typeof value === 'function' ? (value as () => T)() : value
}

export function useComposerEvents(options: UseComposerEventsOptions) {
	// Handle paste events
	function handlePaste(view: EditorView, event: ClipboardEvent): boolean {
		const clipboardData = event.clipboardData
		if (!clipboardData) return false

		const mediaHandler = resolve(options.mediaHandler)
		// Let media handler check for images first
		if (mediaHandler && options.features.imageUpload) {
			const handled = mediaHandler.handlePasteImage(clipboardData)
			if (handled) return true
		}

		// Handle text paste - preserve links while stripping other formatting
		const htmlData = clipboardData.getData('text/html')
		const plainText = clipboardData.getData('text/plain')

		if (htmlData && plainText) {
			event.preventDefault()

			// Use editor commands to insert HTML content
			const editorInstance = resolve(options.editor)
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

	// Handle editor click
	function handleEditorClick(event: MouseEvent) {
		const editorVal = resolve(options.editor)
		if (editorVal) {
			focusEditor(editorVal, event)
		}
	}

	// Handle editor keyboard events
	function handleEditorKeydown(event: KeyboardEvent) {
		const editorVal = resolve(options.editor)
		if (editorVal && (event.key === 'Enter' || event.key === ' ')) {
			focusEditor(editorVal, event)
		}
	}

	// Handle drag and drop for images
	function handleDrop(view: EditorView, event: DragEvent): boolean {
		const mediaHandlerVal = resolve(options.mediaHandler)
		if (!options.features.imageUpload || !mediaHandlerVal) return false

		const files = event.dataTransfer?.files
		if (!files || files.length === 0) return false

		// Check if any file is an image
		const imageFile = Array.from(files).find((file) => file.type.startsWith('image/'))
		if (!imageFile) return false

		event.preventDefault()

		// Get drop position
		const coords = { left: event.clientX, top: event.clientY }
		const pos = view.posAtCoords(coords)
		if (!pos) return false

		// Set cursor position to drop location
		const { state, dispatch } = view
		const transaction = state.tr.setSelection(
			Selection.near(state.doc.resolve(pos.pos))
		)
		dispatch(transaction)

		// Upload the image
		mediaHandlerVal.uploadImage(imageFile)
		return true
	}

	// Handle file input for image selection
	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement
		const file = input.files?.[0]
		const mediaHandlerVal = resolve(options.mediaHandler)
		if (!file || !mediaHandlerVal) return

		if (file.type.startsWith('image/')) {
			mediaHandlerVal.uploadImage(file)
		}

		// Clear the input
		input.value = ''
	}

	// Create hidden file input for image selection
	function createFileInput(): HTMLInputElement {
		const input = document.createElement('input')
		input.type = 'file'
		input.accept = 'image/*'
		input.style.display = 'none'
		input.addEventListener('change', handleFileSelect)
		document.body.appendChild(input)
		return input
	}

	// Trigger file selection dialog
	function selectImageFile() {
		const input = createFileInput()
		input.click()
		// Clean up after a delay
		setTimeout(() => {
			document.body.removeChild(input)
		}, 1000)
	}

	return {
		handlePaste,
		handleEditorClick,
		handleEditorKeydown,
		handleDrop,
		selectImageFile
	}
}
