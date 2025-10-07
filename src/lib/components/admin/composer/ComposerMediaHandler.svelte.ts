import type { Editor } from '@tiptap/core'
import type { Media } from '@prisma/client'

export interface MediaHandlerOptions {
	editor: Editor
	albumId?: number
	features: {
		imageUpload?: boolean
		mediaLibrary?: boolean
	}
}

export class ComposerMediaHandler {
	private editor: Editor
	private albumId?: number
	private features: MediaHandlerOptions['features']

	constructor(options: MediaHandlerOptions) {
		this.editor = options.editor
		this.albumId = options.albumId
		this.features = options.features
	}

	async uploadImage(file: File): Promise<void> {
		if (!this.editor || !this.features.imageUpload) return

		// Validate file size (2MB max)
		const filesize = file.size / 1024 / 1024
		if (filesize > 2) {
			alert(`Image too large! File size: ${filesize.toFixed(2)} MB (max 2MB)`)
			return
		}

		// Create a placeholder while uploading
		const placeholderSrc = URL.createObjectURL(file)
		this.editor.commands.insertContent({
			type: 'image',
			attrs: {
				src: placeholderSrc,
				alt: '',
				title: '',
				mediaId: null
			}
		})

		try {
			const formData = new FormData()
			formData.append('file', file)

			// Add albumId if available
			if (this.albumId) {
				formData.append('albumId', this.albumId.toString())
			}

			const response = await fetch('/api/media/upload', {
				method: 'POST',
				body: formData,
				credentials: 'same-origin'
			})

			if (!response.ok) {
				throw new Error('Upload failed')
			}

			const media = await response.json()

			// Replace placeholder with actual URL
			const displayWidth = media.width && media.width > 600 ? 600 : media.width

			this.editor.commands.insertContent([
				{
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
				},
				{
					type: 'paragraph'
				}
			])

			// Clean up the object URL
			URL.revokeObjectURL(placeholderSrc)
		} catch (error) {
			console.error('Image upload failed:', error)
			alert('Failed to upload image. Please try again.')
			// Remove the placeholder on error
			this.editor.commands.undo()
			URL.revokeObjectURL(placeholderSrc)
		}
	}

	handleMediaSelect(media: Media): void {
		if (!this.editor) return

		// Remove placeholder if it exists
		if (this.editor.storage.imageModal?.placeholderPos !== undefined) {
			const pos = this.editor.storage.imageModal.placeholderPos
			this.editor
				.chain()
				.focus()
				.deleteRange({ from: pos, to: pos + 1 })
				.run()
			this.editor.storage.imageModal.placeholderPos = undefined
		}

		// Check if it's a video
		const isVideo = media.mimeType?.startsWith('video/')

		if (isVideo) {
			// Insert video
			this.editor.commands.insertContent({
				type: 'video',
				attrs: {
					src: media.url,
					title: media.description || media.filename || '',
					mediaId: media.id.toString()
				}
			})
		} else {
			// Calculate display dimensions
			const displayWidth = media.width && media.width > 600 ? 600 : media.width

			// Insert image
			this.editor.commands.insertContent([
				{
					type: 'image',
					attrs: {
						src: media.url,
						alt: media.filename || '',
						title: media.description || '',
						width: displayWidth,
						height: media.height,
						align: 'center',
						mediaId: media.id.toString()
					}
				},
				{
					type: 'paragraph'
				}
			])
		}
	}

	handleMediaClose(): void {
		// Remove the placeholder if user cancelled
		if (this.editor && this.editor.storage.imageModal?.placeholderPos !== undefined) {
			const pos = this.editor.storage.imageModal.placeholderPos
			this.editor
				.chain()
				.focus()
				.deleteRange({ from: pos, to: pos + 1 })
				.run()
			this.editor.storage.imageModal.placeholderPos = undefined
		}
	}

	handlePasteImage(clipboardData: DataTransfer): boolean {
		if (!this.features.imageUpload) return false

		// Check for images
		const imageItem = Array.from(clipboardData.items).find(
			(item) => item.type.indexOf('image') === 0
		)

		if (imageItem) {
			const file = imageItem.getAsFile()
			if (!file) return false

			// Upload the image
			this.uploadImage(file)
			return true // Prevent default paste behavior
		}

		return false
	}
}
