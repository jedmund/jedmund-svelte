<script lang="ts">
	import type { NodeViewProps } from '@tiptap/core'
	import Image from 'lucide-svelte/icons/image'
	import Upload from 'lucide-svelte/icons/upload'
	import Link from 'lucide-svelte/icons/link'
	import { NodeViewWrapper } from 'svelte-tiptap'

	const { editor }: NodeViewProps = $props()

	let fileInput: HTMLInputElement
	let isDragging = $state(false)

	function handleClick(e: MouseEvent) {
		if (!editor.isEditable) return
		e.preventDefault()

		// Show options: upload file or enter URL
		const choice = confirm('Click OK to upload a file, or Cancel to enter a URL')

		if (choice) {
			// Upload file
			fileInput?.click()
		} else {
			// Enter URL
			const imageUrl = prompt('Enter the URL of an image:')
			if (imageUrl) {
				editor.chain().focus().setImage({ src: imageUrl }).run()
			}
		}
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

			// Insert the uploaded image with reasonable default width
			const displayWidth = media.width && media.width > 600 ? 600 : media.width

			editor
				.chain()
				.focus()
				.setImage({
					src: media.url,
					alt: media.filename || '',
					width: displayWidth,
					height: media.height,
					align: 'center'
				})
				.run()
		} catch (error) {
			console.error('Image upload failed:', error)
			alert('Failed to upload image. Please try again.')
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
</script>

<NodeViewWrapper class="edra-media-placeholder-wrapper" contenteditable="false">
	<input
		bind:this={fileInput}
		type="file"
		accept="image/*"
		onchange={handleFileSelect}
		style="display: none;"
	/>

	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<span
		class="edra-media-placeholder-content {isDragging ? 'dragging' : ''}"
		onclick={handleClick}
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondrop={handleDrop}
		tabindex="0"
		role="button"
		aria-label="Insert An Image"
	>
		<Image class="edra-media-placeholder-icon" />
		<span class="edra-media-placeholder-text">
			{isDragging ? 'Drop image here' : 'Click to upload or drag & drop'}
		</span>
		<span class="edra-media-placeholder-subtext"> or paste from clipboard </span>
	</span>
</NodeViewWrapper>

<style>
	.edra-media-placeholder-content {
		transition: all 0.2s ease;
	}

	.edra-media-placeholder-content.dragging {
		background-color: rgba(59, 130, 246, 0.1);
		border-color: rgb(59, 130, 246);
	}

	.edra-media-placeholder-subtext {
		font-size: 0.875em;
		opacity: 0.7;
		margin-top: 0.25rem;
	}
</style>
