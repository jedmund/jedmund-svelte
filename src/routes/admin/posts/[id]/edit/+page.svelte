<script lang="ts">
	import { page } from '$app/stores'
	import { goto, beforeNavigate } from '$app/navigation'
	import { onMount } from 'svelte'
	import { api } from '$lib/admin/api'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import AdminSegmentedControl from '$lib/components/admin/AdminSegmentedControl.svelte'
	import Composer from '$lib/components/admin/composer'
	import LoadingSpinner from '$lib/components/admin/LoadingSpinner.svelte'
	import PostMetadataForm from '$lib/components/admin/PostMetadataForm.svelte'
	import DeleteConfirmationModal from '$lib/components/admin/DeleteConfirmationModal.svelte'
	import UnsavedChangesModal from '$lib/components/admin/UnsavedChangesModal.svelte'
	import StatusDropdown from '$lib/components/admin/StatusDropdown.svelte'
	import type { JSONContent } from '@tiptap/core'

	interface Tag {
		id: number
		name: string
		displayName: string
		slug: string
	}

	// Type for what the API actually returns (JSON-serialized Post)
	interface ApiPost {
		id: number
		slug: string
		postType: string
		title: string | null
		content: Record<string, unknown> | null
		featuredImage: string | null
		tags: Array<{ tag: Tag }> | null
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
	let tags = $state<Tag[]>([])
	let activeTab = $state('content')
	let heartCount = $state<number | undefined>()
	let showDeleteConfirmation = $state(false)
	let showUnsavedChangesModal = $state(false)
	let pendingNavigationUrl = $state<string | null>(null)
	let allowNavigation = $state(false)

	// Track initial values to detect unsaved changes
	let initialValues = $state<{
		title: string
		postType: 'post' | 'essay'
		status: 'draft' | 'published'
		slug: string
		excerpt: string
		content: string
		tags: Tag[]
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
			tags.map((t) => t.id).sort().join(',') !==
				initialValues.tags.map((t) => t.id).sort().join(','))
	)

	const postTypeConfig = {
		post: { icon: '💭', label: 'Post', showTitle: false, showContent: true },
		essay: { icon: '📝', label: 'Essay', showTitle: true, showContent: true }
	}

	let config = $derived(postTypeConfig[postType])

	const tabOptions = [
		{ value: 'content', label: 'Content' },
		{ value: 'metadata', label: 'Metadata' }
	]

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
		// Allow navigation if explicitly permitted
		if (allowNavigation) {
			allowNavigation = false
			return
		}

		// Only intercept in-app navigation, not page unloads (refresh/close)
		if (isDirty && navigation.type !== 'leave' && navigation.to) {
			pendingNavigationUrl = navigation.to.url.pathname
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

	async function fetchHeartCount(postSlug: string) {
		try {
			const res = await fetch(`/api/heart/universe/${postSlug}`)
			if (res.ok) {
				const data = await res.json()
				heartCount = Object.values(data).reduce((sum: number, n) => sum + (n as number), 0)
			}
		} catch {
			// Silently fail - heart count is non-critical
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

				tags = data.tags ? data.tags.map((pt) => pt.tag) : []

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

				// Fetch heart count (non-blocking)
				if (data.slug) {
					fetchHeartCount(data.slug)
				}
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
			tagIds: tags.map((tag) => tag.id)
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
		pendingNavigationUrl = null
	}

	function handleLeaveWithoutSaving() {
		showUnsavedChangesModal = false
		if (pendingNavigationUrl) {
			const url = pendingNavigationUrl
			pendingNavigationUrl = null
			allowNavigation = true
			goto(url)
		}
	}

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
				<h1 class="object-type">{config.label}</h1>
			</div>
			<div class="header-center">
				<AdminSegmentedControl
					options={tabOptions}
					value={activeTab}
					onChange={(value) => (activeTab = value)}
				/>
			</div>
			<div class="header-actions">
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
					onDelete={openDeleteConfirmation}
				/>
			</div>
		{/if}
	</header>
	{/snippet}

	<div class="admin-container">
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
			<div class="tab-panels">
				<!-- Content Panel -->
				<div class="panel panel-content" class:active={activeTab === 'content'}>
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

				<!-- Metadata Panel -->
				<div class="panel content-wrapper" class:active={activeTab === 'metadata'}>
					<PostMetadataForm
						{postType}
						bind:slug
						bind:excerpt
						bind:tags
						{heartCount}
						createdAt={post.createdAt}
						updatedAt={post.updatedAt}
						publishedAt={post.publishedAt}
						contentId={post.id}
						contentStatus={post.status}
					/>
				</div>
			</div>
		{:else}
			<div class="error">Post not found</div>
		{/if}
	</div>
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

	header {
		display: grid;
		grid-template-columns: 250px 1fr 250px;
		align-items: center;
		width: 100%;
		gap: $unit-2x;

		.header-left {
			width: 250px;
			display: flex;
			align-items: center;
			gap: $unit-2x;
		}

		.header-center {
			display: flex;
			justify-content: center;
			align-items: center;
		}

		.header-actions {
			width: 250px;
			display: flex;
			justify-content: flex-end;
			gap: $unit-2x;
		}
	}

	.object-type {
		margin: 0;
		font-size: 1rem;
		font-weight: 500;
		color: $gray-20;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.admin-container {
		width: 100%;
		margin: 0 auto;
		padding: 0 $unit-2x $unit-4x;
		box-sizing: border-box;

		@include breakpoint('phone') {
			padding: 0 $unit-2x $unit-2x;
		}
	}

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

	.tab-panels {
		position: relative;

		.panel {
			display: none;
			box-sizing: border-box;

			&.active {
				display: block;
			}
		}
	}

	.content-wrapper {
		background: white;
		border-radius: $unit-2x;
		padding: 0;
		width: 100%;
		margin: 0 auto;
	}

	.panel-content {
		background: transparent;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		width: 100%;
	}

	.main-content {
		display: flex;
		flex-direction: column;
		gap: $unit-2x;
		min-width: 0;
	}

	.title-input {
		width: 100%;
		max-width: clamp(600px, 70%, 840px);
		margin-inline: auto;
		padding: 0;
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
		padding: 0;
	}

	.error {
		text-align: center;
		color: $gray-40;
		padding: 2rem;
	}
</style>
