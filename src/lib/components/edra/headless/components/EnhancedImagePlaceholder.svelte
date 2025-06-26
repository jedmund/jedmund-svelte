<script lang="ts">
	import type { NodeViewProps } from '@tiptap/core'
	import type { Media } from '@prisma/client'
	import Image from 'lucide-svelte/icons/image'
	import Upload from 'lucide-svelte/icons/upload'
	import { NodeViewWrapper } from 'svelte-tiptap'
	import { getContext, onMount } from 'svelte'
	import { mediaSelectionStore } from '$lib/stores/media-selection'

	const { editor, deleteNode }: NodeViewProps = $props()

	// Get album context if available
	const editorContext = getContext<any>('editorContext') || {}
	const albumId = $derived(editorContext.albumId)

	let fileInput: HTMLInputElement
	let isUploading = $state(false)
	let autoOpenModal = $state(false)

	// If configured to auto-open modal, do it on mount
	onMount(() => {
		// Check if we should auto-open from editor storage
		if (editor.storage.imageModal?.placeholderPos !== undefined) {
			autoOpenModal = true
			// Modal is already open from the composer level
		}
	})

	function handleBrowseLibrary(e: MouseEvent) {
		if (!editor.isEditable) return
		e.preventDefault()

		// Open modal through the store
		mediaSelectionStore.open({
			mode: 'single',
			fileType: 'image',
			albumId,
			onSelect: handleMediaSelect,
			onClose: handleMediaLibraryClose
		})
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

			const imageAttrs = {
				src: selectedMedia.url,
				alt: selectedMedia.altText || '',
				title: selectedMedia.description || '',
				width: displayWidth,
				height: selectedMedia.height,
				align: 'center',
				mediaId: selectedMedia.id?.toString()
			}

			editor
				.chain()
				.focus()
				.insertContent({
					type: 'image',
					attrs: imageAttrs
				})
				.run()
		}

		// Close the store
		mediaSelectionStore.close()

		// Delete the placeholder node
		deleteNode()
	}

	function handleMediaLibraryClose() {
		// Close the store
		mediaSelectionStore.close()

		// Delete placeholder if user cancelled
		deleteNode()
	}

	async function handleFileUpload(event: Event) {
		const input = event.target as HTMLInputElement
		const files = input.files
		if (!files || files.length === 0) return

		const file = files[0]
		if (!file.type.startsWith('image/')) {
			alert('Please select an image file.')
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
			const formData = new FormData()
			formData.append('file', file)
			formData.append('type', 'image')

			// If we have an albumId, add it to the upload
			if (albumId) {
				formData.append('albumId', albumId.toString())
			}

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

				// Set a reasonable default width (max 600px)
				const displayWidth = media.width && media.width > 600 ? 600 : media.width

				const imageAttrs = {
					src: media.url,
					alt: media.altText || '',
					title: media.description || '',
					width: displayWidth,
					height: media.height,
					align: 'center',
					mediaId: media.id?.toString()
				}

				editor
					.chain()
					.focus()
					.insertContent({
						type: 'image',
						attrs: imageAttrs
					})
					.run()
			} else {
				console.error('Failed to upload image:', response.status)
				alert('Failed to upload image. Please try again.')
			}
		} catch (error) {
			console.error('Error uploading image:', error)
			alert('Failed to upload image. Please try again.')
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

<NodeViewWrapper class="edra-media-placeholder-wrapper" contenteditable="false">
	<div class="edra-media-placeholder-container">
		{#if isUploading}
			<div class="edra-media-placeholder-uploading">
				<div class="spinner"></div>
				<span>Uploading...</span>
			</div>
		{:else if !autoOpenModal}
			<button
				class="edra-media-placeholder-option"
				onclick={handleDirectUpload}
				onkeydown={handleKeyDown}
				tabindex="0"
				aria-label="Upload Image"
				title="Upload from device"
			>
				<Upload class="edra-media-placeholder-icon" />
				<span class="edra-media-placeholder-text">Upload Image</span>
			</button>

			<button
				class="edra-media-placeholder-option"
				onclick={handleBrowseLibrary}
				onkeydown={handleKeyDown}
				tabindex="0"
				aria-label="Browse Media Library"
				title="Choose from library"
			>
				<Image class="edra-media-placeholder-icon" />
				<span class="edra-media-placeholder-text">Browse Library</span>
			</button>
		{/if}
	</div>

	<!-- Hidden file input -->
	<input
		bind:this={fileInput}
		type="file"
		accept="image/*"
		onchange={handleFileUpload}
		style="display: none;"
	/>
</NodeViewWrapper>

<style lang="scss">
	@import '$styles/variables';

	.edra-media-placeholder-wrapper {
		width: 100%;
		margin-bottom: 1rem;
		margin-left: 2.25rem;
		margin-right: 2.25rem;

		@media (max-width: 768px) {
			margin-left: 2rem;
			margin-right: 2rem;
		}
	}

	.edra-media-placeholder-container {
		display: flex;
		gap: $unit-2x;
		padding: $unit-3x;
		border: 2px dashed $gray-85;
		border-radius: $corner-radius;
		background: $gray-95;
		transition: all 0.2s ease;
		justify-content: center;
		align-items: center;
		min-height: 80px;

		&:hover {
			border-color: $gray-70;
			background: $gray-90;
		}
	}

	.edra-media-placeholder-option {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: $unit;
		padding: $unit-2x $unit-3x;
		border: 1px solid $gray-85;
		border-radius: $corner-radius-sm;
		background: $white;
		cursor: pointer;
		transition: all 0.2s ease;
		min-width: 140px;

		&:hover {
			border-color: $gray-70;
			background: $gray-95;
			transform: translateY(-1px);
		}

		&:focus {
			outline: none;
			border-color: $primary-color;
			box-shadow: 0 0 0 3px rgba($primary-color, 0.1);
		}
	}

	.edra-media-placeholder-uploading {
		display: flex;
		align-items: center;
		gap: $unit;
		padding: $unit-3x;
		color: $gray-50;
	}

	.spinner {
		width: $unit-2x;
		height: $unit-2x;
		border: 2px solid $gray-90;
		border-top: 2px solid $primary-color;
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

	:global(.edra-media-placeholder-icon) {
		width: $unit-3x + $unit-half;
		height: $unit-3x + $unit-half;
		color: $gray-50;
	}

	.edra-media-placeholder-text {
		font-size: $font-size-small;
		color: $gray-50;
		font-weight: 500;
	}
</style>
