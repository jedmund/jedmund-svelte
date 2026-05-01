<script lang="ts">
	import { goto, beforeNavigate, replaceState } from '$app/navigation'
	import { onMount } from 'svelte'
	import { api } from '$lib/admin/api'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import AdminSegmentedControl from '$lib/components/admin/AdminSegmentedControl.svelte'
	import Composer from '$lib/components/admin/composer'
	import PostMetadataForm from '$lib/components/admin/PostMetadataForm.svelte'
	import PostSyndicationForm from '$lib/components/admin/PostSyndicationForm.svelte'
	import DeleteConfirmationModal from '$lib/components/admin/DeleteConfirmationModal.svelte'
	import UnsavedChangesModal from '$lib/components/admin/UnsavedChangesModal.svelte'
	import StatusDropdown from '$lib/components/admin/StatusDropdown.svelte'
	import type { JSONContent } from '@tiptap/core'
	import type { ApiPost, PostFormTag as Tag } from './post-types'

	// Legacy blocks format (pre-Tiptap) — still in some old posts.
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

	interface Props {
		initialPost?: ApiPost | null
		initialPostType?: 'post' | 'essay'
		initialContent?: JSONContent | null
	}

	let { initialPost = null, initialPostType = 'post', initialContent = null }: Props = $props()

	let id = $state<number | null>(initialPost?.id ?? null)
	let updatedAt = $state<string | null>(initialPost?.updatedAt ?? null)

	let title = $state(initialPost?.title ?? '')
	let postType = $state<'post' | 'essay'>(
		(initialPost?.postType as 'post' | 'essay') || initialPostType
	)
	let status = $state<'draft' | 'published'>(
		(initialPost?.status as 'draft' | 'published') || 'draft'
	)
	let slug = $state(initialPost?.slug ?? '')
	let slugManuallySet = $state(initialPost !== null)
	let excerpt = $state(initialPost?.excerpt ?? '')
	let syndicationText = $state(initialPost?.syndicationText ?? '')
	let featuredImage = $state(initialPost?.featuredImage ?? '')
	let syndicateBluesky = $state(initialPost?.syndicateBluesky ?? true)
	let syndicateMastodon = $state(initialPost?.syndicateMastodon ?? true)
	let appendLink = $state(initialPost?.appendLink ?? true)
	let content = $state<JSONContent>(
		initialPost
			? normalizeContent(initialPost.content)
			: (initialContent ?? { type: 'doc', content: [] })
	)
	let tags = $state<Tag[]>(initialPost?.tags?.map((pt) => pt.tag) ?? [])

	let saving = $state(false)
	let activeTab = $state('content')
	let heartCount = $state<number | undefined>()
	let showDeleteConfirmation = $state(false)
	let showUnsavedChangesModal = $state(false)
	let pendingNavigationUrl = $state<string | null>(null)
	let allowNavigation = $state(false)
	let savedSnapshot = $state<string | null>(initialPost ? snapshot() : null)

	const postTypeConfig = {
		post: { icon: '💭', label: 'Post', showTitle: false, showContent: true },
		essay: { icon: '📝', label: 'Essay', showTitle: true, showContent: true }
	}
	let config = $derived(postTypeConfig[postType])

	const tabOptions = $derived(
		id === null
			? [
					{ value: 'content', label: 'Content' },
					{ value: 'metadata', label: 'Metadata' }
				]
			: [
					{ value: 'content', label: 'Content' },
					{ value: 'metadata', label: 'Metadata' },
					{ value: 'syndication', label: 'Syndication' }
				]
	)

	function snapshot() {
		return JSON.stringify({
			title,
			postType,
			status,
			slug,
			excerpt,
			syndicationText,
			featuredImage,
			syndicateBluesky,
			syndicateMastodon,
			appendLink,
			content,
			tagIds: tags
				.map((t) => t.id)
				.sort()
				.join(',')
		})
	}

	// Pre-first-save: dirty if the form has any content. After save: dirty if state diverges from the saved snapshot.
	let isDirty = $derived(
		savedSnapshot === null
			? title.trim() !== '' ||
					slug.trim() !== '' ||
					excerpt.trim() !== '' ||
					syndicationText.trim() !== '' ||
					tags.length > 0 ||
					(content.content && content.content.length > 0)
			: snapshot() !== savedSnapshot
	)

	// Auto-generate slug from title for new posts.
	$effect(() => {
		if (title && !slugManuallySet) {
			slug = title
				.toLowerCase()
				.replace(/[^a-z0-9\s]+/g, '')
				.replace(/\s+/g, '-')
				.replace(/^-+|-+$/g, '')
		}
	})

	// Cmd+S keyboard shortcut.
	$effect(() => {
		function handleKeydown(e: KeyboardEvent) {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
				e.preventDefault()
				handleSave(status)
			}
		}
		document.addEventListener('keydown', handleKeydown)
		return () => document.removeEventListener('keydown', handleKeydown)
	})

	// Browser warning for page unloads (refresh/close).
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

	beforeNavigate((navigation) => {
		if (allowNavigation) {
			allowNavigation = false
			return
		}
		if (isDirty && navigation.type !== 'leave' && navigation.to) {
			pendingNavigationUrl = navigation.to.url.pathname
			navigation.cancel()
			showUnsavedChangesModal = true
		}
	})

	function normalizeContent(raw: unknown): JSONContent {
		if (raw && typeof raw === 'object') {
			if ('blocks' in raw) {
				return convertBlocksToTiptap(raw as unknown as BlockContent)
			}
			if ((raw as { type?: string }).type === 'doc') {
				return raw as JSONContent
			}
		}
		return { type: 'doc', content: [] }
	}

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
						content: Array.isArray(block.content)
							? block.content.map((item) => ({
									type: 'listItem',
									content: [
										{
											type: 'paragraph',
											content: [
												{
													type: 'text',
													text: (typeof item === 'object' && item.content) || String(item)
												}
											]
										}
									]
								}))
							: []
					}
				case 'orderedList':
				case 'ol':
					return {
						type: 'orderedList',
						content: Array.isArray(block.content)
							? block.content.map((item) => ({
									type: 'listItem',
									content: [
										{
											type: 'paragraph',
											content: [
												{
													type: 'text',
													text: (typeof item === 'object' && item.content) || String(item)
												}
											]
										}
									]
								}))
							: []
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

	onMount(() => {
		if (initialPost?.slug) {
			fetchHeartCount(initialPost.slug)
		}
	})

	async function handleSave(target: string) {
		const targetStatus = (target as 'draft' | 'published') || status
		saving = true

		const postData = {
			title: config?.showTitle ? title : null,
			slug: slug || `post-${Date.now()}`,
			type: postType,
			status: targetStatus,
			content: config?.showContent ? content : null,
			excerpt: postType === 'essay' ? excerpt : undefined,
			syndicationText: syndicationText || null,
			featuredImage: featuredImage || null,
			syndicateBluesky,
			syndicateMastodon,
			appendLink,
			tagIds: tags.map((tag) => tag.id)
		}

		try {
			if (id === null) {
				const created = await api.post<ApiPost>('/api/posts', postData)
				id = created.id
				updatedAt = created.updatedAt
				replaceState(`/admin/posts/${created.id}/edit`, {})
			} else {
				const saved = await api.put<ApiPost>(`/api/posts/${id}`, {
					...postData,
					updatedAt
				})
				if (saved) {
					updatedAt = saved.updatedAt
				}
			}
			status = targetStatus
			savedSnapshot = snapshot()
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
		if (id === null) return
		try {
			await api.delete(`/api/posts/${id}`)
			showDeleteConfirmation = false
			allowNavigation = true
			goto('/admin/posts')
		} catch (error) {
			console.error('Failed to delete post:', error)
		}
	}

	async function handleCopyPreviewLink() {
		if (!slug) return
		try {
			const res = await api.post<{ url: string }>('/api/preview/generate', {
				contentType: postType === 'essay' ? 'post' : 'post',
				slug
			})
			if (res?.url) {
				const fullUrl = `${window.location.origin}${res.url}`
				await navigator.clipboard.writeText(fullUrl)
			}
		} catch (error) {
			console.error('Failed to generate preview link:', error)
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
		>{title ? `${title} - Admin @jedmund` : id === null ? 'New Post' : 'Edit Post'} - Admin @jedmund</title
	>
</svelte:head>

<AdminPage>
	{#snippet header()}
		<header>
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
					{status}
					onSave={handleSave}
					disabled={saving}
					isLoading={saving}
					viewUrl={status === 'published' && slug ? `/universe/${slug}` : undefined}
					onDelete={id !== null ? openDeleteConfirmation : undefined}
					onCopyPreviewLink={id !== null && slug ? handleCopyPreviewLink : undefined}
				/>
			</div>
		</header>
	{/snippet}

	<div class="admin-container">
		<div class="tab-panels">
			<div class="panel panel-content" class:active={activeTab === 'content'}>
				<div class="main-content">
					{#if config?.showTitle}
						<input type="text" bind:value={title} placeholder="Title" class="title-input" />
					{/if}

					{#if config?.showContent}
						<div class="editor-wrapper">
							<Composer
								bind:data={content}
								placeholder={id === null ? 'Start writing...' : 'Continue writing...'}
							/>
						</div>
					{/if}
				</div>
			</div>

			<div class="panel content-wrapper" class:active={activeTab === 'metadata'}>
				<PostMetadataForm
					{postType}
					bind:slug
					bind:excerpt
					bind:featuredImage
					bind:tags
					{heartCount}
					createdAt={initialPost?.createdAt ?? new Date().toISOString()}
					updatedAt={initialPost?.updatedAt ?? new Date().toISOString()}
					publishedAt={initialPost?.publishedAt ?? null}
				/>
			</div>

			{#if id !== null && initialPost}
				<div class="panel content-wrapper" class:active={activeTab === 'syndication'}>
					<PostSyndicationForm
						{postType}
						{slug}
						{title}
						{excerpt}
						{content}
						{featuredImage}
						bind:syndicationText
						bind:syndicateBluesky
						bind:syndicateMastodon
						bind:appendLink
						contentId={id}
						contentStatus={status}
					/>
				</div>
			{/if}
		</div>
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
</style>
