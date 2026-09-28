import { api } from '$lib/admin/api'
import { replaceUploadPlaceholder } from './image-placeholder'
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
	private controller = new AbortController()
	private objectUrls = new Set<string>()
	private disposed = false

	constructor(options: MediaHandlerOptions) {
		this.editor = options.editor
		this.albumId = options.albumId
		this.features = options.features
	}

	async uploadImage(file: File): Promise<void> {
		if (this.disposed || this.editor.isDestroyed || !this.features.imageUpload) return

		// Validate file size (2MB max)
		const filesize = file.size / 1024 / 1024
		if (filesize > 2) {
			alert(`Image too large! File size: ${filesize.toFixed(2)} MB (max 2MB)`)
			return
		}

		// Create a placeholder while uploading
		const placeholderSrc = URL.createObjectURL(file)
		this.objectUrls.add(placeholderSrc)
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

			const media = await api.post<Media>('/api/media/upload', formData, {
				signal: this.controller.signal
			})
			if (this.disposed || this.editor.isDestroyed) return

			// Replace placeholder with actual URL
			const displayWidth = media.width && media.width > 600 ? 600 : media.width

			replaceUploadPlaceholder(this.editor, placeholderSrc, {
				type: 'image',
				attrs: {
					src: media.url,
					alt: media.description || '',
					title: '',
					width: displayWidth,
					height: media.height,
					align: 'center',
					mediaId: media.id.toString()
				}
			})
		} catch (error) {
			if (!this.disposed && !this.editor.isDestroyed) {
				console.error('Image upload failed:', error)
				alert('Failed to upload image. Please try again.')
				replaceUploadPlaceholder(this.editor, placeholderSrc)
			}
		} finally {
			URL.revokeObjectURL(placeholderSrc)
			this.objectUrls.delete(placeholderSrc)
		}
	}

	dispose() {
		this.disposed = true
		this.controller.abort()
		for (const url of this.objectUrls) URL.revokeObjectURL(url)
		this.objectUrls.clear()
	}

	handleMediaSelect(media: Media): void {
		if (this.disposed || this.editor.isDestroyed) return

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
					title: '',
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
						alt: media.description || '',
						title: '',
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
		if (
			!this.disposed &&
			!this.editor.isDestroyed &&
			this.editor.storage.imageModal?.placeholderPos !== undefined
		) {
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
