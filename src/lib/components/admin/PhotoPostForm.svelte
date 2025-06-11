<script lang="ts">
	import { goto } from '$app/navigation'
	import AdminPage from './AdminPage.svelte'
	import Button from './Button.svelte'
	import Input from './Input.svelte'
	import ImageUploader from './ImageUploader.svelte'
	import Editor from './Editor.svelte'
	import type { JSONContent } from '@tiptap/core'
	import type { Media } from '@prisma/client'

	interface Props {
		postId?: number
		initialData?: {
			title?: string
			content?: JSONContent
			featuredImage?: string
			status: 'draft' | 'published'
			tags?: string[]
		}
		mode: 'create' | 'edit'
	}

	let { postId, initialData, mode }: Props = $props()

	// State
	let isSaving = $state(false)
	let error = $state('')
	let status = $state<'draft' | 'published'>(initialData?.status || 'draft')

	// Form data
	let title = $state(initialData?.title || '')
	let content = $state<JSONContent>(initialData?.content || { type: 'doc', content: [] })
	let featuredImage = $state<Media | null>(null)
	let tags = $state(initialData?.tags?.join(', ') || '')

	// Editor ref
	let editorRef: any

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
			error = 'Please upload a photo for this post'
			return
		}

		if (!title.trim()) {
			error = 'Please enter a title for this post'
			return
		}

		try {
			isSaving = true
			error = ''

			// Get editor content
			let editorContent = content
			if (editorRef) {
				const editorData = await editorRef.save()
				if (editorData) {
					editorContent = editorData
				}
			}

			const auth = localStorage.getItem('admin_auth')
			if (!auth) {
				goto('/admin/login')
				return
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
					Authorization: `Basic ${auth}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload)
			})

			if (!response.ok) {
				throw new Error(`Failed to ${mode === 'edit' ? 'update' : 'create'} photo post`)
			}

			const savedPost = await response.json()

			// Redirect to posts list or edit page
			if (mode === 'create') {
				goto(`/admin/posts/${savedPost.id}/edit`)
			} else {
				goto('/admin/posts')
			}
		} catch (err) {
			error = `Failed to ${mode === 'edit' ? 'update' : 'create'} photo post`
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
					{isSaving ? 'Publishing...' : 'Publish'}
				</Button>
			{/if}
		</div>
	</header>

	<div class="form-container">
		{#if error}
			<div class="error-message">{error}</div>
		{/if}

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
			color: $grey-10;
		}

		.subtitle {
			font-size: 0.875rem;
			color: $grey-40;
			margin: 0;
		}
	}

	.header-actions {
		display: flex;
		gap: $unit-2x;
		align-items: center;
	}

	.form-container {
		max-width: 800px;
		margin: 0 auto;
		padding: $unit-4x;

		@include breakpoint('phone') {
			padding: $unit-3x;
		}
	}

	.error-message {
		background-color: #fee;
		color: #d33;
		padding: $unit-3x;
		border-radius: $unit;
		margin-bottom: $unit-4x;
		text-align: center;
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
		color: $grey-20;
		margin-bottom: $unit-half;
	}

	.editor-help {
		font-size: 0.8rem;
		color: $grey-40;
		margin: 0 0 $unit-2x 0;
		line-height: 1.4;
	}

	.editor-container {
		border: 1px solid $grey-80;
		border-radius: $unit;
		overflow: hidden;

		:global(.photo-post-editor) {
			min-height: 200px;
		}
	}
</style>
