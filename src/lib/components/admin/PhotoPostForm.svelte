<script lang="ts">
	import { goto, beforeNavigate } from '$app/navigation'
	import AdminPage from './AdminPage.svelte'
	import Button from './Button.svelte'
	import Input from './Input.svelte'
	import ImageUploader from './ImageUploader.svelte'
	import Editor from './Editor.svelte'
	import { toast } from '$lib/stores/toast'
	import { makeDraftKey, saveDraft, loadDraft, clearDraft, timeAgo } from '$lib/admin/draftStore'
	import { createAutoSaveStore } from '$lib/admin/autoSave.svelte'
	import AutoSaveStatus from './AutoSaveStatus.svelte'
	import type { JSONContent } from '@tiptap/core'
	import type { Media, Post } from '@prisma/client'
	import type { Editor } from '@tiptap/core'

	// Payload type for photo posts
	interface PhotoPayload {
		title: string
		slug: string
		type: string
		status: string
		content: JSONContent
		featuredImage: string | null
		tags: string[]
		updatedAt?: string
	}

	interface Props {
		postId?: number
		initialData?: {
			title?: string
			content?: JSONContent
			featuredImage?: string
			status: 'draft' | 'published'
			tags?: string[]
			updatedAt?: string
		}
		mode: 'create' | 'edit'
	}

	let { postId, initialData, mode }: Props = $props()

	// State
	let isSaving = $state(false)
	let hasLoaded = $state(mode === 'create')
	let status = $state<'draft' | 'published'>(initialData?.status || 'draft')
	let updatedAt = $state<string | undefined>(initialData?.updatedAt)

	// Form data
	let title = $state(initialData?.title || '')
	let content = $state<JSONContent>(initialData?.content || { type: 'doc', content: [] })
	let featuredImage = $state<Media | null>(null)
	let tags = $state(initialData?.tags?.join(', ') || '')

	// Editor ref
	let editorRef: Editor | undefined

	// Draft backup
	const draftKey = $derived(makeDraftKey('post', postId ?? 'new'))
	let showDraftPrompt = $state(false)
	let draftTimestamp = $state<number | null>(null)
	let timeTicker = $state(0)
	const draftTimeText = $derived.by(() => (draftTimestamp ? (timeTicker, timeAgo(draftTimestamp)) : null))

function buildPayload(): PhotoPayload {
  return {
    title: title.trim(),
    slug: createSlug(title),
    type: 'photo',
    status,
    content,
    featuredImage: featuredImage ? featuredImage.url : null,
    tags: tags
      ? tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [],
    updatedAt
  }
}

// Autosave store (edit mode only)
let autoSave = mode === 'edit' && postId
	? createAutoSaveStore({
			debounceMs: 2000,
			getPayload: () => (hasLoaded ? buildPayload() : null),
			save: async (payload, { signal }) => {
				const response = await fetch(`/api/posts/${postId}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
					credentials: 'same-origin',
					signal
				})
				if (!response.ok) throw new Error('Failed to save')
				return await response.json()
			},
			onSaved: (saved: Post, { prime }) => {
				updatedAt = saved.updatedAt.toISOString()
				prime(buildPayload())
				if (draftKey) clearDraft(draftKey)
			}
		})
	: null

	// Prime autosave on initial load (edit mode only)
	$effect(() => {
		if (mode === 'edit' && initialData && !hasLoaded && autoSave) {
			autoSave.prime(buildPayload())
			hasLoaded = true
		}
	})

	// Trigger autosave when form data changes
	$effect(() => {
		title; status; content; featuredImage; tags
		if (hasLoaded && autoSave) {
			autoSave.schedule()
		}
	})

	// Save draft only when autosave fails
	$effect(() => {
		if (hasLoaded && autoSave) {
			const saveStatus = autoSave.status
			if (saveStatus === 'error' || saveStatus === 'offline') {
				saveDraft(draftKey, buildPayload())
			}
		}
	})

$effect(() => {
  const draft = loadDraft<PhotoPayload>(draftKey)
  if (draft) {
    showDraftPrompt = true
    draftTimestamp = draft.ts
  }
})

	function restoreDraft() {
		const draft = loadDraft<PhotoPayload>(draftKey)
		if (!draft) return
		const p = draft.payload
		title = p.title ?? title
		status = p.status ?? status
		content = p.content ?? content
		tags = Array.isArray(p.tags) ? (p.tags as string[]).join(', ') : tags
		if (p.featuredImage) {
			featuredImage = {
				id: -1,
				filename: 'photo.jpg',
				originalName: 'photo.jpg',
				mimeType: 'image/jpeg',
				size: 0,
				url: p.featuredImage,
				thumbnailUrl: p.featuredImage,
				width: null,
				height: null,
				altText: null,
				description: null,
				usedIn: [],
				createdAt: new Date(),
				updatedAt: new Date()
			} as unknown
		}
		showDraftPrompt = false
		clearDraft(draftKey)
	}

	function dismissDraft() {
		showDraftPrompt = false
		clearDraft(draftKey)
	}

	// Auto-update draft time text every minute when prompt visible
	$effect(() => {
		if (showDraftPrompt) {
			const id = setInterval(() => (timeTicker = timeTicker + 1), 60000)
			return () => clearInterval(id)
		}
	})

	// Navigation guard: flush autosave before navigating away (only if unsaved)
	beforeNavigate(async (_navigation) => {
		if (hasLoaded && autoSave) {
			if (autoSave.status === 'saved') {
				return
			}
			// Flush any pending changes before allowing navigation to proceed
			try {
				await autoSave.flush()
			} catch (error) {
				console.error('Autosave flush failed:', error)
			}
		}
	})

	// Warn before closing browser tab/window if there are unsaved changes
	$effect(() => {
		if (!hasLoaded || !autoSave) return

		function handleBeforeUnload(event: BeforeUnloadEvent) {
			if (autoSave!.status !== 'saved') {
				event.preventDefault()
				event.returnValue = ''
			}
		}

		window.addEventListener('beforeunload', handleBeforeUnload)
		return () => window.removeEventListener('beforeunload', handleBeforeUnload)
	})

	// Keyboard shortcut: Cmd/Ctrl+S to save immediately
	$effect(() => {
		if (!hasLoaded || !autoSave) return

		function handleKeydown(e: KeyboardEvent) {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
				e.preventDefault()
				autoSave!.flush().catch((error) => {
					console.error('Autosave flush failed:', error)
				})
			}
		}

		document.addEventListener('keydown', handleKeydown)
		return () => document.removeEventListener('keydown', handleKeydown)
	})

	// Cleanup autosave on unmount
	$effect(() => {
		if (autoSave) {
			return () => autoSave.destroy()
		}
	})

	// Initialize featured image if editing
	$effect(() => {
		if (initialData?.featuredImage && mode === 'edit') {
			// Create a minimal Media object for display
			featuredImage = {
				id: -1,
				filename: 'photo.jpg',
				originalName: 'photo.jpg',
				mimeType: 'image/jpeg',
				size: 0,
				url: initialData.featuredImage,
				thumbnailUrl: initialData.featuredImage,
				width: null,
				height: null,
				altText: null,
				description: null,
				usedIn: [],
				createdAt: new Date(),
				updatedAt: new Date()
			}
		}
	})

	function handleFeaturedImageUpload(media: Media) {
		featuredImage = media

		// If no title is set, use the media filename as a starting point
		if (!title.trim() && media.originalName) {
			title = media.originalName.replace(/\.[^/.]+$/, '') // Remove file extension
		}
	}

	function createSlug(title: string): string {
		return title
			.toLowerCase()
			.trim()
			.replace(/[^\w\s-]/g, '') // Remove special characters
			.replace(/\s+/g, '-') // Replace spaces with hyphens
			.replace(/-+/g, '-') // Replace multiple hyphens with single
			.replace(/^-|-$/g, '') // Remove leading/trailing hyphens
	}

	async function handleSave() {
		// Validate required fields
		if (!featuredImage) {
			toast.error('Please upload a photo for this post')
			return
		}

		if (!title.trim()) {
			toast.error('Please enter a title for this post')
			return
		}

		const loadingToastId = toast.loading(
			`${status === 'published' ? 'Publishing' : 'Saving'} photo post...`
		)

		try {
			isSaving = true

			// Get editor content
			let editorContent = content
			if (editorRef) {
				const editorData = await editorRef.save()
				if (editorData) {
					editorContent = editorData
				}
			}

			// Generate slug from title
			const slug = createSlug(title)

			const payload = {
				title: title.trim(),
				slug,
				type: 'photo',
				status,
				content: editorContent,
				featuredImage: featuredImage.url,
				tags: tags
					? tags
							.split(',')
							.map((tag) => tag.trim())
							.filter(Boolean)
					: []
			}

			const url = mode === 'edit' ? `/api/posts/${postId}` : '/api/posts'
			const method = mode === 'edit' ? 'PUT' : 'POST'

			const response = await fetch(url, {
				method,
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload),
				credentials: 'same-origin'
			})

			if (!response.ok) {
				if (response.status === 401) {
					goto('/admin/login')
					return
				}
				throw new Error(`Failed to ${mode === 'edit' ? 'update' : 'create'} photo post`)
			}

    const savedPost = await response.json()

    toast.dismiss(loadingToastId)
    toast.success(`Photo post ${status === 'published' ? 'published' : 'saved'} successfully!`)
    clearDraft(draftKey)

			// Redirect to posts list or edit page
			if (mode === 'create') {
				goto(`/admin/posts/${savedPost.id}/edit`)
			} else {
				goto('/admin/posts')
			}
		} catch (err) {
			toast.dismiss(loadingToastId)
			toast.error(`Failed to ${mode === 'edit' ? 'update' : 'create'} photo post`)
			console.error(err)
		} finally {
			isSaving = false
		}
	}

	async function handlePublish() {
		status = 'published'
		await handleSave()
	}

	async function handleDraft() {
		status = 'draft'
		await handleSave()
	}
</script>

<AdminPage>
	<header slot="header">
		<div class="header-content">
			<h1>{mode === 'edit' ? 'Edit Photo Post' : 'New Photo Post'}</h1>
			<p class="subtitle">Share a photo with a caption and description</p>
		</div>

		<div class="header-actions">
			{#if !isSaving}
				{#if mode === 'edit' && autoSave}
					<AutoSaveStatus status={autoSave.status} error={autoSave.lastError} />
				{/if}
				<Button variant="ghost" onclick={() => goto('/admin/posts')}>Cancel</Button>
				<Button
					variant="secondary"
					onclick={handleDraft}
					disabled={!featuredImage || !title.trim()}
				>
					Save Draft
				</Button>
				<Button
					variant="primary"
					onclick={handlePublish}
					disabled={!featuredImage || !title.trim()}
				>
					Publish
				</Button>
			{/if}
		</div>
	</header>

	{#if showDraftPrompt}
		<div class="draft-banner">
			<div class="draft-banner-content">
				<span class="draft-banner-text">
					Unsaved draft found{#if draftTimeText} (saved {draftTimeText}){/if}.
				</span>
				<div class="draft-banner-actions">
					<button class="draft-banner-button" onclick={restoreDraft}>Restore</button>
					<button class="draft-banner-button dismiss" onclick={dismissDraft}>Dismiss</button>
				</div>
			</div>
		</div>
	{/if}

	<div class="form-container">
		<div class="form-content">
			<!-- Featured Photo Upload -->
			<div class="form-section">
				<ImageUploader
					label="Photo"
					value={featuredImage}
					onUpload={handleFeaturedImageUpload}
					placeholder="Upload the main photo for this post"
					helpText="This photo will be displayed prominently in the post"
					showBrowseLibrary={true}
					required={true}
				/>
			</div>

			<!-- Title -->
			<div class="form-section">
				<Input
					type="text"
					label="Title"
					bind:value={title}
					placeholder="Enter a title for this photo post"
					required={true}
					fullWidth={true}
				/>
			</div>

			<!-- Caption/Content -->
			<div class="form-section">
				<label class="editor-label">Caption & Description</label>
				<p class="editor-help">Add a caption or tell the story behind this photo</p>
				<div class="editor-container">
					<Editor
						bind:this={editorRef}
						bind:data={content}
						placeholder="Write a caption or description for this photo..."
						minHeight={200}
						autofocus={false}
						class="photo-post-editor"
					/>
				</div>
			</div>

			<!-- Tags -->
			<div class="form-section">
				<Input
					type="text"
					label="Tags (Optional)"
					bind:value={tags}
					placeholder="nature, photography, travel (comma-separated)"
					helpText="Add tags to help categorize this photo post"
					fullWidth={true}
				/>
			</div>
		</div>
	</div>
</AdminPage>

<style lang="scss">
	.header-content {
		h1 {
			font-size: 1.75rem;
			font-weight: 700;
			margin: 0 0 $unit-half 0;
			color: $gray-10;
		}

		.subtitle {
			font-size: 0.875rem;
			color: $gray-40;
			margin: 0;
		}
	}

	.header-actions {
		display: flex;
		gap: $unit-2x;
		align-items: center;
	}

	.draft-banner {
		background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
		border-bottom: 1px solid #f59e0b;
		box-shadow: 0 2px 8px rgba(245, 158, 11, 0.15);
		padding: $unit-3x $unit-4x;
		animation: slideDown 0.3s ease-out;

		@include breakpoint('phone') {
			padding: $unit-2x $unit-3x;
		}
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.draft-banner-content {
		max-width: 1200px;
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: $unit-3x;

		@include breakpoint('phone') {
			flex-direction: column;
			align-items: flex-start;
			gap: $unit-2x;
		}
	}

	.draft-banner-text {
		color: #92400e;
		font-size: 0.875rem;
		font-weight: 500;
		line-height: 1.5;

		@include breakpoint('phone') {
			font-size: 0.8125rem;
		}
	}

	.draft-banner-actions {
		display: flex;
		gap: $unit-2x;
		flex-shrink: 0;

		@include breakpoint('phone') {
			width: 100%;
		}
	}

	.draft-banner-button {
		background: white;
		border: 1px solid #f59e0b;
		color: #92400e;
		padding: $unit $unit-3x;
		border-radius: $unit;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;

		&:hover {
			background: #fffbeb;
			border-color: #d97706;
			transform: translateY(-1px);
			box-shadow: 0 2px 4px rgba(245, 158, 11, 0.2);
		}

		&:active {
			transform: translateY(0);
		}

		&.dismiss {
			background: transparent;
			border-color: #fbbf24;
			color: #b45309;

			&:hover {
				background: rgba(255, 255, 255, 0.5);
				border-color: #f59e0b;
			}
		}

		@include breakpoint('phone') {
			flex: 1;
			padding: $unit-1_5x $unit-2x;
			font-size: 0.8125rem;
		}
	}

	.form-container {
		max-width: 800px;
		margin: 0 auto;
		padding: $unit-4x;

		@include breakpoint('phone') {
			padding: $unit-3x;
		}
	}

	.form-content {
		background: white;
		border-radius: $unit-2x;
		padding: $unit-6x;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

		@include breakpoint('phone') {
			padding: $unit-4x;
		}
	}

	.form-section {
		margin-bottom: $unit-6x;

		&:last-child {
			margin-bottom: 0;
		}
	}

	.editor-label {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		color: $gray-20;
		margin-bottom: $unit-half;
	}

	.editor-help {
		font-size: 0.8rem;
		color: $gray-40;
		margin: 0 0 $unit-2x 0;
		line-height: 1.4;
	}

	.editor-container {
		border: 1px solid $gray-80;
		border-radius: $unit;
		overflow: hidden;

		:global(.photo-post-editor) {
			min-height: 200px;
		}
	}
</style>
