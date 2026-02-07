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
		fileType={mediaType === 'audio' ? 'all' : mediaType}
		onSelect={handleMediaSelect}
		onClose={handleMediaLibraryClose}
	/>
</NodeViewWrapper>

<style lang="scss">
	@import '$styles/variables';

	.edra-media-placeholder-container {
		display: flex;
		gap: $unit-half;
		padding: $unit-2x;
		border: 2px dashed $gray-85;
		border-radius: $corner-radius-md;
		background: $gray-97;
		transition: all 0.2s ease;
		justify-content: center;
		align-items: center;
	}

	.edra-media-placeholder-container:hover {
		border-color: $gray-80;
		background: $gray-95;
	}

	.edra-media-placeholder-option {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: $unit;
		padding: $unit-half $unit-2x;
		border: 1px solid $gray-85;
		border-radius: $corner-radius-sm;
		background: $white;
		cursor: pointer;
		transition: all 0.2s ease;
		min-width: 120px;
	}

	.edra-media-placeholder-option:hover {
		border-color: $gray-80;
		background: $gray-97;
		transform: translateY(-1px);
	}

	.edra-media-placeholder-option:focus {
		outline: none;
		border-color: $blue-50;
		box-shadow: 0 0 0 3px rgba($blue-50, 0.1);
	}

	.edra-media-placeholder-uploading {
		display: flex;
		align-items: center;
		gap: $unit;
		padding: $unit-2x;
		color: $gray-40;
	}

	.spinner {
		width: $unit-2x;
		height: $unit-2x;
		border: 2px solid $gray-90;
		border-top: 2px solid $blue-50;
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
		width: $unit-3x;
		height: $unit-3x;
		color: $gray-40;
	}

	.edra-media-placeholder-text {
		font-size: 14px;
		color: $gray-40;
		font-weight: 500;
	}
</style>
