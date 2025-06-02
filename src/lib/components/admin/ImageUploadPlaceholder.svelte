<script lang="ts">
	import type { NodeViewProps } from '@tiptap/core'
	import type { Media } from '@prisma/client'
	import Image from 'lucide-svelte/icons/image'
	import Upload from 'lucide-svelte/icons/upload'
	import Link from 'lucide-svelte/icons/link'
	import Grid from 'lucide-svelte/icons/grid-3x3'
	import { NodeViewWrapper } from 'svelte-tiptap'
	import MediaLibraryModal from './MediaLibraryModal.svelte'

	const { editor, deleteNode }: NodeViewProps = $props()

	let fileInput: HTMLInputElement
	let isDragging = $state(false)
	let isMediaLibraryOpen = $state(false)
	let isUploading = $state(false)

	function handleBrowseLibrary(e: MouseEvent) {
		if (!editor.isEditable) return
		e.preventDefault()
		isMediaLibraryOpen = true
	}

	function handleDirectUpload(e: MouseEvent) {
		if (!editor.isEditable) return
		e.preventDefault()
		fileInput.click()
	}

	function handleMediaSelect(media: Media | Media[]) {
		const selectedMedia = Array.isArray(media) ? media[0] : media
		if (selectedMedia) {
			// Set a reasonable default width (max 600px)
			const displayWidth =
				selectedMedia.width && selectedMedia.width > 600 ? 600 : selectedMedia.width

			editor
				.chain()
				.focus()
				.setImage({
					src: selectedMedia.url,
					alt: selectedMedia.altText || '',
					width: displayWidth,
					height: selectedMedia.height,
					align: 'center'
				})
				.run()
		}
		isMediaLibraryOpen = false
	}

	function handleMediaLibraryClose() {
		isMediaLibraryOpen = false
	}

	async function handleFileSelect(e: Event) {
		const target = e.target as HTMLInputElement
		const file = target.files?.[0]
		if (file) {
			await uploadFile(file)
		}
		// Reset input
		target.value = ''
	}

	async function uploadFile(file: File) {
		// Check file type
		if (!file.type.startsWith('image/')) {
			alert('Please select an image file')
			return
		}

		// Check file size (2MB max)
		const filesize = file.size / 1024 / 1024
		if (filesize > 2) {
			alert(`Image too large! File size: ${filesize.toFixed(2)} MB (max 2MB)`)
			return
		}

		isUploading = true

		try {
			const auth = localStorage.getItem('admin_auth')
			if (!auth) {
				throw new Error('Not authenticated')
			}

			const formData = new FormData()
			formData.append('file', file)
			formData.append('type', 'image')

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

			// Insert the uploaded image with reasonable default width
			const displayWidth = media.width && media.width > 600 ? 600 : media.width

			editor
				.chain()
				.focus()
				.setImage({
					src: media.url,
					alt: media.altText || '',
					width: displayWidth,
					height: media.height,
					align: 'center'
				})
				.run()
		} catch (error) {
			console.error('Image upload failed:', error)
			alert('Failed to upload image. Please try again.')
		} finally {
			isUploading = false
		}
	}

	// Drag and drop handlers
	function handleDragOver(e: DragEvent) {
		e.preventDefault()
		e.stopPropagation()
		isDragging = true
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault()
		e.stopPropagation()
		isDragging = false
	}

	async function handleDrop(e: DragEvent) {
		e.preventDefault()
		e.stopPropagation()
		isDragging = false

		const file = e.dataTransfer?.files[0]
		if (file && file.type.startsWith('image/')) {
			await uploadFile(file)
		}
	}

	// Handle keyboard navigation
	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault()
			handleBrowseLibrary(e as any)
		} else if (e.key === 'Escape') {
			deleteNode()
		}
	}
</script>

<NodeViewWrapper class="edra-media-placeholder-wrapper" contenteditable="false">
	<input
		bind:this={fileInput}
		type="file"
		accept="image/*"
		onchange={handleFileSelect}
		style="display: none;"
	/>

	<div class="edra-image-placeholder-container">
		{#if isUploading}
			<div class="edra-image-placeholder-uploading">
				<div class="spinner"></div>
				<span>Uploading image...</span>
			</div>
		{:else}
			<button
				class="edra-image-placeholder-option"
				onclick={handleDirectUpload}
				onkeydown={handleKeyDown}
				tabindex="0"
				aria-label="Upload Image"
				title="Upload from device"
			>
				<Upload class="edra-image-placeholder-icon" />
				<span class="edra-image-placeholder-text">Upload Image</span>
			</button>

			<button
				class="edra-image-placeholder-option"
				onclick={handleBrowseLibrary}
				onkeydown={handleKeyDown}
				tabindex="0"
				aria-label="Browse Media Library"
				title="Choose from library"
			>
				<Grid class="edra-image-placeholder-icon" />
				<span class="edra-image-placeholder-text">Browse Library</span>
			</button>
		{/if}
	</div>

	<!-- Media Library Modal -->
	<MediaLibraryModal
		bind:isOpen={isMediaLibraryOpen}
		mode="single"
		fileType="image"
		onSelect={handleMediaSelect}
		onClose={handleMediaLibraryClose}
	/>
</NodeViewWrapper>

<style>
	.edra-image-placeholder-container {
		display: flex;
		gap: 12px;
		padding: 24px;
		border: 2px dashed #e5e7eb;
		border-radius: 8px;
		background: #f9fafb;
		transition: all 0.2s ease;
		justify-content: center;
		align-items: center;
	}

	.edra-image-placeholder-container:hover {
		border-color: #d1d5db;
		background: #f3f4f6;
	}

	.edra-image-placeholder-option {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 16px 20px;
		border: 1px solid #e5e7eb;
		border-radius: 6px;
		background: white;
		cursor: pointer;
		transition: all 0.2s ease;
		min-width: 140px;
	}

	.edra-image-placeholder-option:hover {
		border-color: #d1d5db;
		background: #f9fafb;
		transform: translateY(-1px);
	}

	.edra-image-placeholder-option:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.edra-image-placeholder-uploading {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 20px;
		color: #6b7280;
	}

	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid #f3f4f6;
		border-top: 2px solid #3b82f6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	:global(.edra-image-placeholder-icon) {
		width: 28px;
		height: 28px;
		color: #6b7280;
	}

	.edra-image-placeholder-text {
		font-size: 14px;
		color: #6b7280;
		font-weight: 500;
	}
</style>
