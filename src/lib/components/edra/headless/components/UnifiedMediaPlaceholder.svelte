<script lang="ts">
	import type { Editor } from '@tiptap/core';
	import type { Media } from '@prisma/client';
	import type { Icon } from '@lucide/svelte';
	import Upload from '@lucide/svelte/icons/upload';
	import { NodeViewWrapper } from 'svelte-tiptap';
	import UnifiedMediaModal from '../../../admin/UnifiedMediaModal.svelte';

	interface Props {
		editor: Editor;
		deleteNode?: () => void;
		mediaType: 'image' | 'audio' | 'video';
		icon: typeof Icon;
		title: string;
		accept: string;
		nodeType: string;
		allowMultiple?: boolean;
	}

	const {
		editor,
		deleteNode,
		mediaType,
		icon: BrowseIcon,
		title,
		accept,
		nodeType,
		allowMultiple = false
	}: Props = $props();

	let isMediaLibraryOpen = $state(false);
	let fileInput: HTMLInputElement;
	let isUploading = $state(false);

	function handleBrowseLibrary(e: MouseEvent) {
		if (!editor.isEditable) return;
		e.preventDefault();
		isMediaLibraryOpen = true;
	}

	function handleDirectUpload(e: MouseEvent) {
		if (!editor.isEditable) return;
		e.preventDefault();
		fileInput.click();
	}

	function handleMediaSelect(media: Media | Media[]) {
		const selectedMedia = Array.isArray(media) ? media[0] : media;
		if (selectedMedia) {
			editor
				.chain()
				.focus()
				.insertContent([
					{
						type: nodeType,
						attrs: {
							src: selectedMedia.url,
							alt: selectedMedia.description || '',
							title: selectedMedia.description || '',
							mediaId: selectedMedia.id?.toString()
						}
					},
					{
						type: 'paragraph'
					}
				])
				.run();
		}
		isMediaLibraryOpen = false;
	}

	function handleMediaLibraryClose() {
		isMediaLibraryOpen = false;
	}

	async function handleFileUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const files = input.files;
		if (!files || files.length === 0) return;

		const file = files[0];
		if (!file.type.startsWith(`${mediaType}/`)) {
			alert(`Please select a ${mediaType} file.`);
			return;
		}

		isUploading = true;

		try {
			const formData = new FormData();
			formData.append('file', file);
			formData.append('type', mediaType);

			const response = await fetch('/api/media/upload', {
				method: 'POST',
				body: formData,
				credentials: 'same-origin'
			});

			if (response.ok) {
				const media = await response.json();
				editor
					.chain()
					.focus()
					.insertContent([
						{
							type: nodeType,
							attrs: {
								src: media.url,
								alt: media.altText || media.description || '',
								title: media.description || '',
								mediaId: media.id?.toString()
							}
						},
						{
							type: 'paragraph'
						}
					])
					.run();
			} else {
				console.error(`Failed to upload ${mediaType}:`, response.status);
				alert(`Failed to upload ${mediaType}. Please try again.`);
			}
		} catch (error) {
			console.error(`Error uploading ${mediaType}:`, error);
			alert(`Failed to upload ${mediaType}. Please try again.`);
		} finally {
			isUploading = false;
			input.value = '';
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleBrowseLibrary(e as unknown as MouseEvent);
		} else if (e.key === 'Escape') {
			deleteNode?.();
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
		{:else}
			<button
				class="edra-media-placeholder-option"
				onclick={handleDirectUpload}
				onkeydown={handleKeyDown}
				tabindex="0"
				aria-label="Upload {title}"
				title="Upload from device"
			>
				<Upload class="edra-media-placeholder-icon" />
				<span class="edra-media-placeholder-text">Upload {title}</span>
			</button>

			<button
				class="edra-media-placeholder-option"
				onclick={handleBrowseLibrary}
				onkeydown={handleKeyDown}
				tabindex="0"
				aria-label="Browse Media Library"
				title="Choose from library"
			>
				<BrowseIcon class="edra-media-placeholder-icon" />
				<span class="edra-media-placeholder-text">Browse Library</span>
			</button>
		{/if}
	</div>

	<!-- Hidden file input -->
	<input
		bind:this={fileInput}
		type="file"
		accept={accept}
		onchange={handleFileUpload}
		style="display: none;"
	/>

	<!-- Media Library Modal -->
	<UnifiedMediaModal
		bind:isOpen={isMediaLibraryOpen}
		mode={allowMultiple ? 'multiple' : 'single'}
		fileType={mediaType}
		onSelect={handleMediaSelect}
		onClose={handleMediaLibraryClose}
	/>
</NodeViewWrapper>

<style>
	.edra-media-placeholder-container {
		display: flex;
		gap: 12px;
		padding: 16px;
		border: 2px dashed #e5e7eb;
		border-radius: 8px;
		background: #f9fafb;
		transition: all 0.2s ease;
		justify-content: center;
		align-items: center;
	}

	.edra-media-placeholder-container:hover {
		border-color: #d1d5db;
		background: #f3f4f6;
	}

	.edra-media-placeholder-option {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 12px 16px;
		border: 1px solid #e5e7eb;
		border-radius: 6px;
		background: white;
		cursor: pointer;
		transition: all 0.2s ease;
		min-width: 120px;
	}

	.edra-media-placeholder-option:hover {
		border-color: #d1d5db;
		background: #f9fafb;
		transform: translateY(-1px);
	}

	.edra-media-placeholder-option:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.edra-media-placeholder-uploading {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 16px;
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

	:global(.edra-media-placeholder-icon) {
		width: 24px;
		height: 24px;
		color: #6b7280;
	}

	.edra-media-placeholder-text {
		font-size: 14px;
		color: #6b7280;
		font-weight: 500;
	}
</style>
