<script lang="ts">
	import { page } from '$app/stores'
	import { goto, beforeNavigate } from '$app/navigation'
	import { onMount } from 'svelte'
	import { api } from '$lib/admin/api'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import Composer from '$lib/components/admin/composer'
	import LoadingSpinner from '$lib/components/admin/LoadingSpinner.svelte'
	import PostMetadataPopover from '$lib/components/admin/PostMetadataPopover.svelte'
	import DeleteConfirmationModal from '$lib/components/admin/DeleteConfirmationModal.svelte'
	import UnsavedChangesModal from '$lib/components/admin/UnsavedChangesModal.svelte'
	import StatusDropdown from '$lib/components/admin/StatusDropdown.svelte'
	import type { JSONContent } from '@tiptap/core'

	// Type for what the API actually returns (JSON-serialized Post)
	interface ApiPost {
		id: number
		slug: string
		postType: string
		title: string | null
		content: Record<string, unknown> | null
		featuredImage: string | null
		tags: string[] | null
		status: string
		publishedAt: string | null
		createdAt: string
		updatedAt: string
		attachments: unknown
		excerpt?: string | null
	}

	// Type for the old blocks format from database
	interface BlockContent {
		blocks: Array<{
			type: string
			content?: string | Array<{ content?: string } | string>
			level?: number
			language?: string
			src?: string
			alt?: string
			caption?: string
		}>
	}

	let post = $state<ApiPost | null>(null)
	let loading = $state(true)
	let hasLoaded = $state(false)
	let saving = $state(false)
	let loadError = $state('')
	let contentReady = $state(false)

	let title = $state('')
	let postType = $state<'post' | 'essay'>('post')
	let status = $state<'draft' | 'published'>('draft')
	let slug = $state('')
	let excerpt = $state('')
	let content = $state<JSONContent>({ type: 'doc', content: [] })
	let tags = $state<string[]>([])
	let tagInput = $state('')
	let showMetadata = $state(false)
	let metadataButtonRef: HTMLButtonElement | undefined = $state.raw()
	let showDeleteConfirmation = $state(false)
	let showUnsavedChangesModal = $state(false)
	let pendingNavigation = $state<Parameters<typeof beforeNavigate>[0] | null>(null)

	// Track initial values to detect unsaved changes
	let initialValues = $state<{
		title: string
		postType: 'post' | 'essay'
		status: 'draft' | 'published'
		slug: string
		excerpt: string
		content: string
		tags: string[]
	}>({
		title: '',
		postType: 'post',
		status: 'draft',
		slug: '',
		excerpt: '',
		content: '',
		tags: []
	})

	// Check if form has unsaved changes
	let isDirty = $derived(
		hasLoaded &&
		(title !== initialValues.title ||
			postType !== initialValues.postType ||
			status !== initialValues.status ||
			slug !== initialValues.slug ||
			excerpt !== initialValues.excerpt ||
			JSON.stringify(content) !== initialValues.content ||
			JSON.stringify(tags) !== JSON.stringify(initialValues.tags))
	)

	const postTypeConfig = {
		post: { icon: '💭', label: 'Post', showTitle: false, showContent: true },
		essay: { icon: '📝', label: 'Essay', showTitle: true, showContent: true }
	}

	let config = $derived(postTypeConfig[postType])

	// Cmd+S keyboard shortcut
	$effect(() => {
		function handleKeydown(e: KeyboardEvent) {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
				e.preventDefault()
				handleSave()
			}
		}
		document.addEventListener('keydown', handleKeydown)
		return () => document.removeEventListener('keydown', handleKeydown)
	})

	// Browser warning for page unloads (refresh/close) - required for these events
	$effect(() => {
		function handleBeforeUnload(e: BeforeUnloadEvent) {
			if (isDirty) {
				e.preventDefault()
				e.returnValue = ''
			}
		}
		window.addEventListener('beforeunload', handleBeforeUnload)
		return () => window.removeEventListener('beforeunload', handleBeforeUnload)
	})

	// Navigation guard for unsaved changes (in-app navigation only)
	beforeNavigate((navigation) => {
		// Only intercept in-app navigation, not page unloads (refresh/close)
		if (isDirty && navigation.type !== 'leave') {
			pendingNavigation = navigation
			navigation.cancel()
			showUnsavedChangesModal = true
		}
	})

	// Convert blocks format (from database) to Tiptap format
	function convertBlocksToTiptap(blocksContent: BlockContent): JSONContent {
		if (!blocksContent || !blocksContent.blocks) {
			return { type: 'doc', content: [] }
		}

		const tiptapContent = blocksContent.blocks.map((block) => {
			switch (block.type) {
				case 'paragraph':
					return {
						type: 'paragraph',
						content: block.content ? [{ type: 'text', text: block.content }] : []
					}

				case 'heading':
					return {
						type: 'heading',
						attrs: { level: block.level || 1 },
						content: block.content ? [{ type: 'text', text: block.content }] : []
					}

				case 'bulletList':
				case 'ul':
					return {
						type: 'bulletList',
						content: Array.isArray(block.content) ? block.content.map((item) => ({
							type: 'listItem',
							content: [
								{
									type: 'paragraph',
									content: [{ type: 'text', text: (typeof item === 'object' && item.content) || String(item) }]
								}
							]
						})) : []
					}

				case 'orderedList':
				case 'ol':
					return {
						type: 'orderedList',
						content: Array.isArray(block.content) ? block.content.map((item) => ({
							type: 'listItem',
							content: [
								{
									type: 'paragraph',
									content: [{ type: 'text', text: (typeof item === 'object' && item.content) || String(item) }]
								}
							]
						})) : []
					}

				case 'blockquote':
					return {
						type: 'blockquote',
						content: [
							{
								type: 'paragraph',
								content: [{ type: 'text', text: block.content || '' }]
							}
						]
					}

				case 'codeBlock':
				case 'code':
					return {
						type: 'codeBlock',
						attrs: { language: block.language || '' },
						content: [{ type: 'text', text: block.content || '' }]
					}

				case 'image':
					return {
						type: 'image',
						attrs: {
							src: block.src || '',
							alt: block.alt || '',
							title: block.caption || ''
						}
					}

				case 'hr':
				case 'horizontalRule':
					return { type: 'horizontalRule' }

				default:
					// Default to paragraph for unknown types
					return {
						type: 'paragraph',
						content: block.content ? [{ type: 'text', text: block.content }] : []
					}
			}
		})

		return {
			type: 'doc',
			content: tiptapContent as JSONContent[]
		}
	}

	onMount(async () => {
		// Wait a tick to ensure page params are loaded
		await new Promise((resolve) => setTimeout(resolve, 0))
		await loadPost()
	})

	async function loadPost() {
		const postId = $page.params.id

		if (!postId) {
			loadError = 'No post ID provided'
			loading = false
			return
		}

		try {
			const data = await api.get<ApiPost>(`/api/posts/${postId}`)
			if (data) {
				post = data

				// Populate form fields
				title = data.title || ''
				postType = (data.postType as 'post' | 'essay') || 'post'
				status = (data.status as 'draft' | 'published') || 'draft'
				slug = data.slug || ''
				excerpt = data.excerpt || ''

				// Convert blocks format to Tiptap format if needed
				const postContent = data.content
				if (postContent && 'blocks' in postContent) {
					content = convertBlocksToTiptap(postContent as unknown as BlockContent)
				} else if (postContent && postContent.type === 'doc') {
					content = postContent as unknown as JSONContent
				} else {
					content = { type: 'doc', content: [] }
				}

				tags = (data.tags as string[]) || []

				// Store initial values for dirty tracking
				initialValues = {
					title,
					postType,
					status,
					slug,
					excerpt,
					content: JSON.stringify(content),
					tags: [...tags]
				}

				// Set content ready after all data is loaded
				contentReady = true
				hasLoaded = true
			} else {
				// Fallback error messaging
					loadError = 'Post not found'
			}
		} catch (_error) {
			loadError = 'Network error occurred while loading post'
		} finally {
			loading = false
		}
	}

	function addTag() {
		if (tagInput && !tags.includes(tagInput)) {
			tags = [...tags, tagInput]
			tagInput = ''
		}
	}

	function removeTag(tag: string) {
		tags = tags.filter((t) => t !== tag)
	}

	async function handleSave(newStatus?: string) {
		saving = true

		// Save content in native Tiptap format to preserve all formatting
		const saveContent = content

		const postData = {
			title: config?.showTitle ? title : null,
			slug,
			type: postType, // No mapping needed anymore
			status: newStatus || status,
			content: config?.showContent ? saveContent : null,
			excerpt: postType === 'essay' ? excerpt : undefined,
			tags
		}

		try {
			const saved = await api.put<ApiPost>(`/api/posts/${$page.params.id}`, {
				...postData,
				updatedAt: post?.updatedAt
			})
			if (saved) {
				post = saved
				if (newStatus) status = newStatus as 'draft' | 'published'
        
				// Update initial values to reflect saved stat
				initialValues = {
					title,
					postType,
					status,
					slug,
					excerpt,
					content: JSON.stringify(content),
					tags: [...tags]
				}
			}
		} catch (error) {
			console.error('Failed to save post:', error)
		} finally {
			saving = false
		}
	}

	function openDeleteConfirmation() {
		showMetadata = false
		showDeleteConfirmation = true
	}

	async function handleDelete() {
		try {
			await api.delete(`/api/posts/${$page.params.id}`)
			showDeleteConfirmation = false
			goto('/admin/posts')
		} catch (error) {
			console.error('Failed to delete post:', error)
		}
	}

	function handleContinueEditing() {
		showUnsavedChangesModal = false
		pendingNavigation = null
	}

	function handleLeaveWithoutSaving() {
		showUnsavedChangesModal = false
		if (pendingNavigation) {
			// Temporarily allow dirty navigation
			const nav = pendingNavigation
			pendingNavigation = null
			nav.to && goto(nav.to.url.pathname)
		}
	}

	function handleMetadataPopover(event: MouseEvent) {
		const target = event.target as Node
		// Don't close if clicking inside the metadata button or anywhere in a metadata popover
		if (
			metadataButtonRef?.contains(target) ||
			document.querySelector('.metadata-popover')?.contains(target)
		) {
			return
		}
		showMetadata = false
	}

	$effect(() => {
		if (showMetadata) {
			document.addEventListener('click', handleMetadataPopover)
			return () => document.removeEventListener('click', handleMetadataPopover)
		}
	})

</script>

<svelte:head>
	<title
		>{post && post.title ? `${post.title} - Admin @jedmund` : 'Edit Post - Admin @jedmund'}</title
	>
</svelte:head>

<AdminPage>
	{#snippet header()}
	<header>
		{#if !loading && post}
			<div class="header-left">
				<button class="btn-icon" onclick={() => goto('/admin/posts')} aria-label="Back to posts">
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
			</div>
			<div class="header-actions">
				<div class="metadata-popover-container">
					<button
						class="btn btn-text"
						onclick={(e) => {
							e.stopPropagation()
							showMetadata = !showMetadata
						}}
						bind:this={metadataButtonRef}
					>
						<svg width="16" height="16" viewBox="0 0 56 56" fill="none">
							<path
								fill="currentColor"
								d="M 36.4023 19.3164 C 38.8398 19.3164 40.9257 17.7461 41.6992 15.5898 L 49.8085 15.5898 C 50.7695 15.5898 51.6133 14.7461 51.6133 13.6914 C 51.6133 12.6367 50.7695 11.8164 49.8085 11.8164 L 41.7226 11.8164 C 40.9257 9.6367 38.8398 8.0430 36.4023 8.0430 C 33.9648 8.0430 31.8789 9.6367 31.1054 11.8164 L 6.2851 11.8164 C 5.2304 11.8164 4.3867 12.6367 4.3867 13.6914 C 4.3867 14.7461 5.2304 15.5898 6.2851 15.5898 L 31.1054 15.5898 C 31.8789 17.7461 33.9648 19.3164 36.4023 19.3164 Z M 6.1913 26.1133 C 5.2304 26.1133 4.3867 26.9570 4.3867 28.0117 C 4.3867 29.0664 5.2304 29.8867 6.1913 29.8867 L 14.5586 29.8867 C 15.3320 32.0898 17.4179 33.6601 19.8554 33.6601 C 22.3164 33.6601 24.4023 32.0898 25.1757 29.8867 L 49.7149 29.8867 C 50.7695 29.8867 51.6133 29.0664 51.6133 28.0117 C 51.6133 26.9570 50.7695 26.1133 49.7149 26.1133 L 25.1757 26.1133 C 24.3789 23.9570 22.2929 22.3867 19.8554 22.3867 C 17.4413 22.3867 15.3554 23.9570 14.5586 26.1133 Z M 36.4023 47.9570 C 38.8398 47.9570 40.9257 46.3867 41.6992 44.2070 L 49.8085 44.2070 C 50.7695 44.2070 51.6133 43.3867 51.6133 42.3320 C 51.6133 41.2773 50.7695 40.4336 49.8085 40.4336 L 41.6992 40.4336 C 40.9257 38.2539 38.8398 36.7070 36.4023 36.7070 C 33.9648 36.7070 31.8789 38.2539 31.1054 40.4336 L 6.2851 40.4336 C 5.2304 40.4336 4.3867 41.2773 4.3867 42.3320 C 4.3867 43.3867 5.2304 44.2070 6.2851 44.2070 L 31.1054 44.2070 C 31.8789 46.3867 33.9648 47.9570 36.4023 47.9570 Z"
							/>
						</svg>
						Metadata
					</button>

					{#if showMetadata && metadataButtonRef}
						<PostMetadataPopover
							{post}
							{postType}
							triggerElement={metadataButtonRef}
							bind:slug
							bind:excerpt
							bind:tags
							bind:tagInput
							onAddTag={addTag}
							onRemoveTag={removeTag}
							onDelete={openDeleteConfirmation}
							onClose={() => (showMetadata = false)}
						/>
					{/if}
				</div>
				<StatusDropdown
					currentStatus={status}
					onStatusChange={handleSave}
					disabled={saving}
					isLoading={saving}
					primaryAction={status === 'draft'
						? { label: 'Save draft', status: 'draft' }
						: { label: 'Save post', status: 'published' }}
					dropdownActions={status === 'draft'
						? [{ label: 'Publish', status: 'published' }]
						: [{ label: 'Save as Draft', status: 'draft' }]}
					viewUrl={slug ? `/universe/${slug}` : undefined}
				/>
			</div>
		{/if}
	</header>
	{/snippet}

	{#if loading}
		<div class="loading-container">
			<LoadingSpinner />
		</div>
	{:else if loadError}
		<div class="error-container">
			<h2>Error Loading Post</h2>
			<p>{loadError}</p>
			<button class="btn btn-primary" onclick={() => loadPost()}>Try Again</button>
		</div>
	{:else if post}
		<div class="post-composer">
			<div class="main-content">
				{#if config?.showTitle}
					<input type="text" bind:value={title} placeholder="Title" class="title-input" />
				{/if}

				{#if config?.showContent && contentReady}
					<div class="editor-wrapper">
						<Composer bind:data={content} placeholder="Continue writing..." />
					</div>
				{/if}
			</div>
		</div>
	{:else}
		<div class="error">Post not found</div>
	{/if}
</AdminPage>

<DeleteConfirmationModal
	bind:isOpen={showDeleteConfirmation}
	title="Delete Post?"
	message="Are you sure you want to delete this post? This action cannot be undone."
	confirmText="Delete Post"
	onConfirm={handleDelete}
	onCancel={() => (showDeleteConfirmation = false)}
/>

<UnsavedChangesModal
	isOpen={showUnsavedChangesModal}
	onContinueEditing={handleContinueEditing}
	onLeave={handleLeaveWithoutSaving}
/>

<style lang="scss">
	@import '$styles/variables.scss';

	.loading-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 400px;
	}

	.error-container {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		min-height: 400px;
		text-align: center;
		gap: $unit-2x;

		h2 {
			color: $gray-20;
			margin: 0;
		}

		p {
			color: $gray-40;
			margin: 0;
		}
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: $unit-2x;
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
		color: $gray-40;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		transition: all 0.2s ease;

		&:hover {
			background: $gray-90;
			color: $gray-10;
		}
	}

	.btn-text {
		padding: $unit $unit-2x;
		border: none;
		background: none;
		color: $gray-40;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: $unit;
		border-radius: 8px;
		font-size: 0.875rem;
		transition: all 0.2s ease;

		&:hover {
			background: $gray-90;
			color: $gray-10;
		}
	}

	.post-composer {
		display: grid;
		grid-template-columns: 1fr;
		gap: $unit-4x;
	}

	.main-content {
		display: flex;
		flex-direction: column;
		gap: $unit-2x;
		min-width: 0;
	}

	.title-input {
		width: 100%;
		padding: 0 $unit-4x;
		border: none;
		font-size: 2.5rem;
		font-weight: 700;
		color: $gray-10;
		background: none;

		&:focus {
			outline: none;
		}

		&::placeholder {
			color: $gray-60;
		}
	}

	.editor-wrapper {
		width: 100%;
		min-height: 400px;
		padding: 0 $unit-4x;
	}

	.metadata-popover-container {
		position: relative;
	}

	.error {
		text-align: center;
		color: $gray-40;
		padding: 2rem;
	}
</style>
