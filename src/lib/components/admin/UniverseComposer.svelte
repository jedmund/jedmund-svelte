<script lang="ts">
	import { createEventDispatcher } from 'svelte'
	import { goto } from '$app/navigation'
	import Modal from './Modal.svelte'
	import Editor from './Editor.svelte'
	import AdminSegmentedControl from './AdminSegmentedControl.svelte'
	import FormFieldWrapper from './FormFieldWrapper.svelte'
	import Button from './Button.svelte'
	import Input from './Input.svelte'
	import MediaLibraryModal from './MediaLibraryModal.svelte'
	import MediaDetailsModal from './MediaDetailsModal.svelte'
	import SmartImage from '../SmartImage.svelte'
	import type { JSONContent } from '@tiptap/core'
	import type { Media } from '@prisma/client'

	export let isOpen = false
	export let initialMode: 'modal' | 'page' = 'modal'
	export let initialPostType: 'post' | 'essay' = 'post'
	export let initialContent: JSONContent | undefined = undefined
	export let closeOnSave = true

	type PostType = 'post' | 'essay'
	type ComposerMode = 'modal' | 'page'

	let postType: PostType = initialPostType
	let mode: ComposerMode = initialMode
	let content: JSONContent = initialContent || {
		type: 'doc',
		content: [{ type: 'paragraph' }]
	}
	let characterCount = 0
	let editorInstance: Editor

	// Essay metadata
	let essayTitle = ''
	let essaySlug = ''
	let essayExcerpt = ''
	let essayTags = ''
	let essayTab = 0

	// Photo attachment state
	let attachedPhotos: Media[] = []
	let isMediaLibraryOpen = false
	let fileInput: HTMLInputElement

	// Media details modal state
	let selectedMedia: Media | null = null
	let isMediaDetailsOpen = false

	const CHARACTER_LIMIT = 280
	const dispatch = createEventDispatcher()

	function handleClose() {
		if (hasContent() && !confirm('Are you sure you want to close? Your changes will be lost.')) {
			return
		}
		resetComposer()
		isOpen = false
		dispatch('close')
	}

	function hasContent(): boolean {
		return characterCount > 0 || attachedPhotos.length > 0
	}

	function resetComposer() {
		postType = initialPostType
		content = {
			type: 'doc',
			content: [{ type: 'paragraph' }]
		}
		characterCount = 0
		attachedPhotos = []
		if (editorInstance) {
			editorInstance.clear()
		}
	}

	function switchToEssay() {
		const contentParam = content ? encodeURIComponent(JSON.stringify(content)) : ''
		goto(`/admin/posts/new?type=essay${contentParam ? `&content=${contentParam}` : ''}`)
	}

	function generateSlug(title: string): string {
		return title
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
	}

	$: if (essayTitle && !essaySlug) {
		essaySlug = generateSlug(essayTitle)
	}


	function handlePhotoUpload() {
		fileInput.click()
	}

	async function handleFileUpload(event: Event) {
		const input = event.target as HTMLInputElement
		const files = input.files
		if (!files || files.length === 0) return

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

			try {
				const response = await fetch('/api/media/upload', {
					method: 'POST',
					headers,
					body: formData
				})

				if (response.ok) {
					const media = await response.json()
					attachedPhotos = [...attachedPhotos, media]
				} else {
					console.error('Failed to upload image:', response.status)
				}
			} catch (error) {
				console.error('Error uploading image:', error)
			}
		}

		// Clear the input
		input.value = ''
	}

	function handleMediaSelect(media: Media | Media[]) {
		const mediaArray = Array.isArray(media) ? media : [media]
		const currentIds = attachedPhotos.map((p) => p.id)
		const newMedia = mediaArray.filter((m) => !currentIds.includes(m.id))
		attachedPhotos = [...attachedPhotos, ...newMedia]
	}

	function handleMediaLibraryClose() {
		isMediaLibraryOpen = false
	}

	function removePhoto(photoId: number) {
		attachedPhotos = attachedPhotos.filter((p) => p.id !== photoId)
	}

	function handlePhotoClick(photo: Media) {
		selectedMedia = photo
		isMediaDetailsOpen = true
	}

	function handleMediaDetailsClose() {
		isMediaDetailsOpen = false
		selectedMedia = null
	}

	function handleMediaUpdate(updatedMedia: Media) {
		// Update the photo in the attachedPhotos array
		attachedPhotos = attachedPhotos.map((photo) =>
			photo.id === updatedMedia.id ? updatedMedia : photo
		)
	}

	function getTextFromContent(json: JSONContent): number {
		if (!json || !json.content) return 0

		let text = ''

		function extractText(node: any) {
			if (node.text) {
				text += node.text
			}
			if (node.content && Array.isArray(node.content)) {
				node.content.forEach(extractText)
			}
		}

		extractText(json)
		return text.length
	}

	async function handleSave() {
		if (!hasContent() && postType !== 'essay') return
		if (postType === 'essay' && !essayTitle) return

		let postData: any = {
			content,
			status: 'published',
			attachedPhotos: attachedPhotos.map((photo) => photo.id)
		}

		if (postType === 'essay') {
			postData = {
				...postData,
				type: 'blog', // 'blog' is the database value for essays
				title: essayTitle,
				slug: essaySlug,
				excerpt: essayExcerpt,
				tags: essayTags ? essayTags.split(',').map((tag) => tag.trim()) : []
			}
		} else {
			// All other content is just a "post" with attachments
			postData = {
				...postData,
				type: 'microblog' // 'microblog' is for shorter posts
			}
		}

		try {
			const auth = localStorage.getItem('admin_auth')
			const headers: Record<string, string> = { 'Content-Type': 'application/json' }
			if (auth) {
				headers.Authorization = `Basic ${auth}`
			}

			const response = await fetch('/api/posts', {
				method: 'POST',
				headers,
				body: JSON.stringify(postData)
			})

			if (response.ok) {
				resetComposer()
				if (closeOnSave) {
					isOpen = false
				}
				dispatch('saved')
				if (postType === 'essay') {
					goto('/admin/posts')
				}
			} else {
				console.error('Failed to save post')
			}
		} catch (error) {
			console.error('Error saving post:', error)
		}
	}

	$: isOverLimit = characterCount > CHARACTER_LIMIT
	$: canSave =
		(postType === 'post' && (characterCount > 0 || attachedPhotos.length > 0) && !isOverLimit) ||
		(postType === 'essay' && essayTitle.length > 0 && content)
</script>

{#if mode === 'modal'}
	<Modal bind:isOpen size="medium" on:close={handleClose} showCloseButton={false}>
		<div class="composer">
			<div class="composer-header">
				<Button variant="ghost" onclick={handleClose}>Cancel</Button>
				<div class="header-right">
					<Button
						variant="ghost"
						iconOnly
						onclick={switchToEssay}
						title="Expand to essay"
						class="expand-button"
					>
						<svg slot="icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
							<path
								d="M10 6L14 2M14 2H10M14 2V6"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
							<path
								d="M6 10L2 14M2 14H6M2 14V10"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</Button>
					<Button variant="primary" onclick={handleSave} disabled={!canSave}>Post</Button>
				</div>
			</div>

			<div class="composer-body">
				<Editor
					bind:this={editorInstance}
					bind:data={content}
					onChange={(newContent) => {
						content = newContent
						characterCount = getTextFromContent(newContent)
					}}
					placeholder="What's on your mind?"
					simpleMode={true}
					autofocus={true}
					minHeight={80}
					showToolbar={false}
					class="composer-editor"
				/>


				{#if attachedPhotos.length > 0}
					<div class="attached-photos">
						{#each attachedPhotos as photo}
							<div class="photo-item">
								<button
									class="photo-button"
									onclick={() => handlePhotoClick(photo)}
									title="View media details"
								>
									<img src={photo.url} alt={photo.altText || ''} class="photo-preview" />
								</button>
								<button
									class="remove-photo"
									onclick={() => removePhoto(photo.id)}
									title="Remove photo"
								>
									<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
										<path
											d="M4 4L12 12M4 12L12 4"
											stroke="currentColor"
											stroke-width="1.5"
											stroke-linecap="round"
											stroke-linejoin="round"
										/>
									</svg>
								</button>
							</div>
						{/each}
					</div>
				{/if}

				<div class="composer-footer">
					<div class="footer-left">

						<Button
							variant="ghost"
							iconOnly
							buttonSize="icon"
							onclick={handlePhotoUpload}
							title="Add image"
							class="tool-button"
						>
							<svg slot="icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
								<rect
									x="2"
									y="2"
									width="14"
									height="14"
									rx="2"
									stroke="currentColor"
									stroke-width="1.5"
								/>
								<circle cx="5.5" cy="5.5" r="1.5" fill="currentColor" />
								<path
									d="M2 12l4-4 3 3 5-5 2 2"
									stroke="currentColor"
									stroke-width="1.5"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
						</Button>

						<Button
							variant="ghost"
							iconOnly
							buttonSize="icon"
							onclick={() => (isMediaLibraryOpen = true)}
							title="Browse library"
							class="tool-button"
						>
							<svg slot="icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
								<path
									d="M2 5L9 12L16 5"
									stroke="currentColor"
									stroke-width="1.5"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
						</Button>
					</div>

					<div class="footer-right">
						{#if postType === 'post'}
							<span
								class="character-count"
								class:warning={characterCount > CHARACTER_LIMIT * 0.9}
								class:error={isOverLimit}
							>
								{CHARACTER_LIMIT - characterCount}
							</span>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</Modal>
{:else if mode === 'page'}
	{#if postType === 'essay'}
		<div class="essay-composer">
			<div class="essay-header">
				<h1>New Essay</h1>
				<div class="essay-actions">
					<Button variant="secondary" onclick={() => goto('/admin/posts')}>Cancel</Button>
					<Button variant="primary" onclick={handleSave} disabled={!canSave}>Publish</Button>
				</div>
			</div>

			<AdminSegmentedControl bind:selectedIndex={essayTab}>
				<button slot="0">Metadata</button>
				<button slot="1">Content</button>
			</AdminSegmentedControl>

			<div class="essay-content">
				{#if essayTab === 0}
					<div class="metadata-section">
						<Input label="Title" bind:value={essayTitle} placeholder="Essay title" required />

						<Input label="Slug" bind:value={essaySlug} placeholder="essay-slug" />

						<Input
							type="textarea"
							label="Excerpt"
							bind:value={essayExcerpt}
							placeholder="Brief description of your essay"
							rows={3}
						/>

						<Input
							label="Tags"
							bind:value={essayTags}
							placeholder="design, development, thoughts"
							helpText="Comma-separated list of tags"
						/>
					</div>
				{:else}
					<div class="content-section">
						<Editor
							bind:this={editorInstance}
							bind:data={content}
							onChange={(newContent) => {
								content = newContent
								characterCount = getTextFromContent(newContent)
							}}
							placeholder="Start writing your essay..."
							simpleMode={false}
							autofocus={true}
							minHeight={500}
						/>
					</div>
				{/if}
			</div>
		</div>
	{:else}
		<div class="inline-composer">
			<Button
				variant="ghost"
				iconOnly
				buttonSize="icon"
				onclick={switchToEssay}
				title="Switch to essay mode"
				class="floating-expand-button"
			>
				<svg slot="icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
					<path
						d="M10 6L14 2M14 2H10M14 2V6"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
					<path
						d="M6 10L2 14M2 14H6M2 14V10"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</Button>
			<div class="composer-body">
				<Editor
					bind:this={editorInstance}
					bind:data={content}
					onChange={(newContent) => {
						content = newContent
						characterCount = getTextFromContent(newContent)
					}}
					placeholder="What's on your mind?"
					simpleMode={true}
					autofocus={true}
					minHeight={120}
					showToolbar={false}
					class="inline-composer-editor"
				/>


				{#if attachedPhotos.length > 0}
					<div class="attached-photos">
						{#each attachedPhotos as photo}
							<div class="photo-item">
								<button
									class="photo-button"
									onclick={() => handlePhotoClick(photo)}
									title="View media details"
								>
									<img src={photo.url} alt={photo.altText || ''} class="photo-preview" />
								</button>
								<button
									class="remove-photo"
									onclick={() => removePhoto(photo.id)}
									title="Remove photo"
								>
									<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
										<path
											d="M4 4L12 12M4 12L12 4"
											stroke="currentColor"
											stroke-width="1.5"
											stroke-linecap="round"
											stroke-linejoin="round"
										/>
									</svg>
								</button>
							</div>
						{/each}
					</div>
				{/if}

				<div class="composer-footer">
					<div class="footer-left">

						<Button
							variant="ghost"
							iconOnly
							buttonSize="icon"
							onclick={handlePhotoUpload}
							title="Add image"
							class="tool-button"
						>
							<svg slot="icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
								<rect
									x="2"
									y="2"
									width="14"
									height="14"
									rx="2"
									stroke="currentColor"
									stroke-width="1.5"
								/>
								<circle cx="5.5" cy="5.5" r="1.5" fill="currentColor" />
								<path
									d="M2 12l4-4 3 3 5-5 2 2"
									stroke="currentColor"
									stroke-width="1.5"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
						</Button>

						<Button
							variant="ghost"
							iconOnly
							buttonSize="icon"
							onclick={() => (isMediaLibraryOpen = true)}
							title="Browse library"
							class="tool-button"
						>
							<svg slot="icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
								<path
									d="M2 5L9 12L16 5"
									stroke="currentColor"
									stroke-width="1.5"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
						</Button>
					</div>

					<div class="footer-right">
						<span
							class="character-count"
							class:warning={characterCount > CHARACTER_LIMIT * 0.9}
							class:error={isOverLimit}
						>
							{CHARACTER_LIMIT - characterCount}
						</span>
						<Button variant="primary" onclick={handleSave} disabled={!canSave}>Post</Button>
					</div>
				</div>
			</div>
		</div>
	{/if}
{/if}

<!-- Hidden file input for photo upload -->
<input
	bind:this={fileInput}
	type="file"
	accept="image/*"
	multiple
	onchange={handleFileUpload}
	style="display: none;"
/>

<!-- Media Library Modal -->
<MediaLibraryModal
	bind:isOpen={isMediaLibraryOpen}
	mode="multiple"
	fileType="image"
	onSelect={handleMediaSelect}
	onClose={handleMediaLibraryClose}
/>

<!-- Media Details Modal -->
{#if selectedMedia}
	<MediaDetailsModal
		bind:isOpen={isMediaDetailsOpen}
		media={selectedMedia}
		onClose={handleMediaDetailsClose}
		onUpdate={handleMediaUpdate}
	/>
{/if}

<style lang="scss">
	@import '$styles/variables.scss';

	.composer {
		padding: 0;
		max-width: 600px;
		margin: 0 auto;
	}

	.composer-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: $unit-2x;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: $unit;
	}

	.composer-body {
		display: flex;
		flex-direction: column;

		:global(.edra-editor) {
			padding: 0;
		}
	}

	:global(.composer-editor) {
		border: none !important;
		box-shadow: none !important;

		:global(.editor-container) {
			padding: 0 $unit-3x;
		}

		:global(.editor-content) {
			padding: 0;
			min-height: 80px;
			font-size: 15px;
			line-height: 1.5;
		}

		:global(.ProseMirror) {
			padding: 0;
			min-height: 80px;

			&:focus {
				outline: none;
			}

			p {
				margin: 0;
			}

			&.ProseMirror-focused .is-editor-empty:first-child::before {
				color: $grey-40;
				content: attr(data-placeholder);
				float: left;
				pointer-events: none;
				height: 0;
			}
		}
	}

	.link-fields {
		padding: 0 $unit-2x $unit-2x;
		display: flex;
		flex-direction: column;
		gap: $unit;
	}

	.composer-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: calc($unit * 1.5) $unit-2x;
		border-top: 1px solid $grey-80;
		background-color: $grey-5;
	}

	.footer-left,
	.footer-right {
		display: flex;
		align-items: center;
		gap: $unit-half;
	}

	.character-count {
		font-size: 13px;
		color: $grey-50;
		font-weight: 400;
		padding: 0 $unit;
		min-width: 30px;
		text-align: right;
		font-variant-numeric: tabular-nums;

		&.warning {
			color: $universe-color;
		}

		&.error {
			color: $red-50;
			font-weight: 500;
		}
	}

	// Essay composer styles
	.essay-composer {
		max-width: 1200px;
		margin: 0 auto;
		padding: $unit-3x;
	}

	.essay-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: $unit-3x;

		h1 {
			font-size: 28px;
			font-weight: 600;
			margin: 0;
		}
	}

	.essay-actions {
		display: flex;
		gap: $unit;
	}

	.essay-content {
		margin-top: $unit-3x;
	}

	.metadata-section {
		max-width: 600px;
		display: flex;
		flex-direction: column;
		gap: $unit-3x;
	}

	.content-section {
		:global(.editor) {
			min-height: 500px;
		}
	}

	// Inline composer styles
	.inline-composer {
		position: relative;
		background: white;
		border-radius: $unit-2x;
		border: 1px solid $grey-80;
		overflow: hidden;
		width: 100%;

		.composer-body {
			display: flex;
			flex-direction: column;

			:global(.edra-editor) {
				padding: 0;
			}
		}
	}

	:global(.floating-expand-button) {
		position: absolute !important;
		top: $unit-2x;
		right: $unit-2x;
		z-index: 10;
		background-color: rgba(255, 255, 255, 0.9) !important;
		backdrop-filter: blur(8px);
		border: 1px solid $grey-80 !important;

		&:hover {
			background-color: rgba(255, 255, 255, 0.95) !important;
		}
	}

	:global(.inline-composer-editor) {
		border: none !important;
		box-shadow: none !important;
		background: transparent !important;

		:global(.editor-container) {
			padding: $unit * 1.5 $unit-3x 0;
		}

		:global(.editor-content) {
			padding: 0;
			min-height: 120px;
			font-size: 15px;
			line-height: 1.5;
		}

		:global(.ProseMirror) {
			padding: 0;
			min-height: 120px;

			&:focus {
				outline: none;
			}

			p {
				margin: 0;
			}

			&.ProseMirror-focused .is-editor-empty:first-child::before {
				color: $grey-40;
				content: attr(data-placeholder);
				float: left;
				pointer-events: none;
				height: 0;
			}
		}
	}

	.inline-composer .link-fields {
		padding: 0 $unit-3x;
		display: flex;
		flex-direction: column;
		gap: $unit-2x;
		margin-top: $unit-2x;
	}

	.inline-composer .composer-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: $unit-2x $unit-3x;
		border-top: 1px solid $grey-80;
		background-color: $grey-90;
	}

	.attached-photos {
		padding: 0 $unit-3x $unit-2x;
		display: flex;
		flex-wrap: wrap;
		gap: $unit;
	}

	.photo-item {
		position: relative;

		.photo-button {
			border: none;
			background: none;
			padding: 0;
			cursor: pointer;
			display: block;
			transition: transform 0.2s ease;

			&:hover {
				transform: scale(1.05);
			}
		}

		:global(.photo-preview) {
			width: 64px;
			height: 64px;
			object-fit: cover;
			border-radius: 12px;
			display: block;
		}

		.remove-photo {
			position: absolute;
			top: -6px;
			right: -6px;
			width: 20px;
			height: 20px;
			border: none;
			border-radius: 50%;
			background: rgba(0, 0, 0, 0.8);
			color: white;
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: center;
			transition: all 0.2s ease;
			opacity: 0;

			&:hover {
				background: rgba(0, 0, 0, 0.9);
			}

			svg {
				width: 10px;
				height: 10px;
			}
		}

		&:hover .remove-photo {
			opacity: 1;
		}
	}

	.inline-composer .attached-photos {
		padding: 0 $unit-3x $unit-2x;
	}
</style>
