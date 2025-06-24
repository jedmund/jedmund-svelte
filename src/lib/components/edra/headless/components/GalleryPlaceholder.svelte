<script lang="ts">
	import type { NodeViewProps } from '@tiptap/core'
	import type { Media } from '@prisma/client'
	import Grid from 'lucide-svelte/icons/grid-3x3'
	import Upload from 'lucide-svelte/icons/upload'
	import { NodeViewWrapper } from 'svelte-tiptap'
	import UnifiedMediaModal from '../../../admin/UnifiedMediaModal.svelte'

	const { editor, deleteNode }: NodeViewProps = $props()

	let isMediaLibraryOpen = $state(false)
	let fileInput: HTMLInputElement
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
		const mediaArray = Array.isArray(media) ? media : [media]
		if (mediaArray.length > 0) {
			const galleryImages = mediaArray.map((m) => ({
				id: m.id,
				url: m.url,
				alt: m.altText || '',
				title: m.description || ''
			}))

			editor.chain().focus().setGallery({ images: galleryImages }).run()
		}
		isMediaLibraryOpen = false
	}

	function handleMediaLibraryClose() {
		isMediaLibraryOpen = false
	}

	async function handleFileUpload(event: Event) {
		const input = event.target as HTMLInputElement
		const files = input.files
		if (!files || files.length === 0) return

		isUploading = true
		const uploadedImages = []

		try {
			for (const file of files) {
				if (!file.type.startsWith('image/')) continue

				const formData = new FormData()
				formData.append('file', file)
				formData.append('type', 'image')

				// Add auth header if needed
				const auth = localStorage.getItem('admin_auth')
				const headers: Record<string, string> = {}
				if (auth) {
					headers.Authorization = `Basic ${auth}`
				}

				const response = await fetch('/api/media/upload', {
					method: 'POST',
					headers,
					body: formData
				})

				if (response.ok) {
					const media = await response.json()
					uploadedImages.push({
						id: media.id,
						url: media.url,
						alt: media.altText || '',
						title: media.description || ''
					})
				} else {
					console.error('Failed to upload image:', response.status)
				}
			}

			if (uploadedImages.length > 0) {
				editor.chain().focus().setGallery({ images: uploadedImages }).run()
			}
		} catch (error) {
			console.error('Error uploading images:', error)
			alert('Failed to upload some images. Please try again.')
		} finally {
			isUploading = false
			// Clear the input
			input.value = ''
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

<NodeViewWrapper class="edra-gallery-placeholder-wrapper" contenteditable="false">
	<div class="edra-gallery-placeholder-container">
		{#if isUploading}
			<div class="edra-gallery-placeholder-uploading">
				<div class="spinner"></div>
				<span>Uploading images...</span>
			</div>
		{:else}
			<button
				class="edra-gallery-placeholder-option"
				onclick={handleDirectUpload}
				onkeydown={handleKeyDown}
				tabindex="0"
				aria-label="Upload Images"
				title="Upload from device"
			>
				<Upload class="edra-gallery-placeholder-icon" />
				<span class="edra-gallery-placeholder-text">Upload Images</span>
			</button>

			<button
				class="edra-gallery-placeholder-option"
				onclick={handleBrowseLibrary}
				onkeydown={handleKeyDown}
				tabindex="0"
				aria-label="Browse Media Library"
				title="Choose from library"
			>
				<Grid class="edra-gallery-placeholder-icon" />
				<span class="edra-gallery-placeholder-text">Browse Library</span>
			</button>
		{/if}
	</div>

	<!-- Hidden file input -->
	<input
		bind:this={fileInput}
		type="file"
		accept="image/*"
		multiple
		onchange={handleFileUpload}
		style="display: none;"
	/>

	<!-- Media Library Modal -->
	<UnifiedMediaModal
		bind:isOpen={isMediaLibraryOpen}
		mode="multiple"
		fileType="image"
		onSelect={handleMediaSelect}
		onClose={handleMediaLibraryClose}
	/>
</NodeViewWrapper>

<style>
	.edra-gallery-placeholder-container {
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

	.edra-gallery-placeholder-container:hover {
		border-color: #d1d5db;
		background: #f3f4f6;
	}

	.edra-gallery-placeholder-option {
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

	.edra-gallery-placeholder-option:hover {
		border-color: #d1d5db;
		background: #f9fafb;
		transform: translateY(-1px);
	}

	.edra-gallery-placeholder-option:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.edra-gallery-placeholder-uploading {
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

	:global(.edra-gallery-placeholder-icon) {
		width: 28px;
		height: 28px;
		color: #6b7280;
	}

	.edra-gallery-placeholder-text {
		font-size: 14px;
		color: #6b7280;
		font-weight: 500;
	}
</style>
