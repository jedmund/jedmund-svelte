<script lang="ts">
	import { goto } from '$app/navigation'
	import AdminPage from './AdminPage.svelte'
	import Button from './Button.svelte'
	import Input from './Input.svelte'
	import GalleryUploader from './GalleryUploader.svelte'
	import Editor from './Editor.svelte'
	import type { JSONContent } from '@tiptap/core'
	import type { Media } from '@prisma/client'

	interface Props {
		postId?: number
		initialData?: {
			title?: string
			content?: JSONContent
			gallery?: Media[]
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
	let content = $state<JSONContent>({ type: 'doc', content: [] })
	let gallery = $state<Media[]>([])
	let tags = $state(initialData?.tags?.join(', ') || '')

	// Editor ref
	let editorRef: any

	// Initialize data for edit mode
	$effect(() => {
		if (initialData && mode === 'edit') {
			// Parse album content structure
			if (
				initialData.content &&
				typeof initialData.content === 'object' &&
				'type' in initialData.content
			) {
				const albumContent = initialData.content as any
				if (albumContent.type === 'album') {
					// Album content structure: { type: 'album', gallery: [mediaIds], description: JSONContent }
					if (albumContent.gallery) {
						// Load media objects from IDs (we'll need to fetch these)
						loadGalleryMedia(albumContent.gallery)
					}
					if (albumContent.description) {
						content = albumContent.description
					}
				}
			} else {
				// Fallback to regular content
				content = initialData.content || { type: 'doc', content: [] }
			}

			// Load gallery from initialData if provided directly
			if (initialData.gallery) {
				gallery = initialData.gallery
			}
		}
	})

	async function loadGalleryMedia(mediaIds: number[]) {
		try {
			const auth = localStorage.getItem('admin_auth')
			if (!auth) return

			const mediaPromises = mediaIds.map(async (id) => {
				const response = await fetch(`/api/media/${id}`, {
					headers: { Authorization: `Basic ${auth}` }
				})
				if (response.ok) {
					return await response.json()
				}
				return null
			})

			const mediaResults = await Promise.all(mediaPromises)
			gallery = mediaResults.filter((media) => media !== null)
		} catch (error) {
			console.error('Failed to load gallery media:', error)
		}
	}

	// Validation
	let isValid = $derived(title.trim().length > 0 && gallery.length > 0)

	function handleGalleryUpload(newMedia: Media[]) {
		gallery = [...gallery, ...newMedia]
	}

	function handleGalleryReorder(reorderedMedia: Media[]) {
		gallery = reorderedMedia
	}

	function handleEditorChange(newContent: JSONContent) {
		content = newContent
	}

	async function handleSave(newStatus: 'draft' | 'published' = status) {
		if (!isValid) return

		isSaving = true
		error = ''

		try {
			const postData = {
				title: title.trim(),
				slug: generateSlug(title),
				postType: 'album',
				status: newStatus,
				content,
				gallery: gallery.map((media) => media.id),
				featuredImage: gallery.length > 0 ? gallery[0].id : undefined,
				tags: tags.trim() ? tags.split(',').map((tag) => tag.trim()) : []
			}

			const url = mode === 'edit' ? `/api/posts/${postId}` : '/api/posts'
			const method = mode === 'edit' ? 'PUT' : 'POST'

			const auth = localStorage.getItem('admin_auth')
			if (!auth) {
				goto('/admin/login')
				return
			}

			const response = await fetch(url, {
				method,
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Basic ${auth}`
				},
				body: JSON.stringify(postData)
			})

			if (!response.ok) {
				const errorData = await response.text()
				throw new Error(`Failed to save album: ${errorData}`)
			}

			status = newStatus
			goto('/admin/posts')
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to save album'
		} finally {
			isSaving = false
		}
	}

	function generateSlug(title: string): string {
		return title
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
	}

	function handleCancel() {
		if (hasChanges() && !confirm('Are you sure you want to cancel? Your changes will be lost.')) {
			return
		}
		goto('/admin/posts')
	}

	function hasChanges(): boolean {
		if (mode === 'create') {
			return title.trim().length > 0 || gallery.length > 0 || tags.trim().length > 0
		}

		// For edit mode, compare with initial data
		return (
			title !== (initialData?.title || '') ||
			gallery !== (initialData?.gallery || []) ||
			tags !== (initialData?.tags?.join(', ') || '')
		)
	}
</script>

<AdminPage>
	<header slot="header">
		<div class="header-left">
			<button class="btn-icon" onclick={handleCancel}>
				<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
					<path
						d="M12.5 15L7.5 10L12.5 5"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</button>
			<h1>📸 {mode === 'create' ? 'New Album' : 'Edit Album'}</h1>
		</div>
		<div class="header-actions">
			{#if mode === 'create'}
				<Button variant="secondary" onclick={handleCancel} disabled={isSaving}>Cancel</Button>
				<Button
					variant="secondary"
					onclick={() => handleSave('draft')}
					disabled={!isValid || isSaving}
				>
					{isSaving ? 'Saving...' : 'Save Draft'}
				</Button>
				<Button
					variant="primary"
					onclick={() => handleSave('published')}
					disabled={!isValid || isSaving}
				>
					{isSaving ? 'Publishing...' : 'Publish Album'}
				</Button>
			{:else}
				<Button variant="secondary" onclick={handleCancel} disabled={isSaving}>Cancel</Button>
				<Button variant="primary" onclick={() => handleSave()} disabled={!isValid || isSaving}>
					{isSaving ? 'Saving...' : 'Save Changes'}
				</Button>
			{/if}
		</div>
	</header>

	<div class="album-form">
		{#if error}
			<div class="error-message">
				{error}
			</div>
		{/if}

		<div class="form-content">
			<div class="form-section">
				<Input
					label="Album Title"
					size="jumbo"
					bind:value={title}
					placeholder="Enter album title"
					required={true}
					error={title.trim().length === 0 ? 'Title is required' : undefined}
				/>
			</div>

			<div class="form-section">
				<GalleryUploader
					label="Album Photos"
					bind:value={gallery}
					onUpload={handleGalleryUpload}
					onReorder={handleGalleryReorder}
					required={true}
					showBrowseLibrary={true}
					maxItems={50}
					placeholder="Add photos to your album"
					helpText="First photo will be used as the album cover"
					error={gallery.length === 0 ? 'At least one photo is required' : undefined}
				/>
			</div>

			<div class="form-section">
				<div class="editor-wrapper">
					<label class="form-label">Description</label>
					<Editor
						bind:this={editorRef}
						bind:data={content}
						onChange={handleEditorChange}
						placeholder="Write a description for your album..."
						simpleMode={false}
						minHeight={200}
					/>
				</div>
			</div>

			<div class="form-section">
				<Input
					label="Tags"
					bind:value={tags}
					placeholder="travel, photography, nature"
					helpText="Separate tags with commas"
				/>
			</div>
		</div>
	</div>
</AdminPage>

<style lang="scss">
	@import '$styles/variables.scss';

	.header-left {
		display: flex;
		align-items: center;
		gap: $unit-2x;

		h1 {
			font-size: 1.5rem;
			font-weight: 700;
			margin: 0;
			color: $grey-10;
		}
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: $unit-2x;
	}

	.btn-icon {
		width: 40px;
		height: 40px;
		border: none;
		background: none;
		color: $grey-40;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		transition: all 0.2s ease;

		&:hover {
			background: $grey-90;
			color: $grey-10;
		}
	}

	.album-form {
		max-width: 800px;
		margin: 0 auto;
		padding: $unit-3x;
	}

	.error-message {
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 8px;
		padding: $unit-2x;
		margin-bottom: $unit-3x;
		color: #dc2626;
		font-size: 0.875rem;
	}

	.form-content {
		display: flex;
		flex-direction: column;
		gap: $unit-4x;
	}

	.form-section {
		display: flex;
		flex-direction: column;
	}

	.editor-wrapper {
		.form-label {
			display: block;
			font-size: 0.875rem;
			font-weight: 600;
			color: $grey-20;
			margin-bottom: $unit;
		}
	}

	@include breakpoint('phone') {
		.album-form {
			padding: $unit-2x;
		}

		.header-actions {
			flex-wrap: wrap;
			gap: $unit;
		}
	}
</style>
