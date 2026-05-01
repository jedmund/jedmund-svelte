<script lang="ts">
	import { goto, beforeNavigate, replaceState } from '$app/navigation'
	import { onMount, flushSync } from 'svelte'
	import { api } from '$lib/admin/api'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import AdminSegmentedControl from '$lib/components/admin/AdminSegmentedControl.svelte'
	import Composer from '$lib/components/admin/composer'
	import PostMetadataForm from '$lib/components/admin/PostMetadataForm.svelte'
	import PostSyndicationForm from '$lib/components/admin/PostSyndicationForm.svelte'
	import DeleteConfirmationModal from '$lib/components/admin/DeleteConfirmationModal.svelte'
	import UnsavedChangesModal from '$lib/components/admin/UnsavedChangesModal.svelte'
	import StatusDropdown from '$lib/components/admin/StatusDropdown.svelte'
	import SaveStatus from '$lib/components/admin/SaveStatus.svelte'
	import type { JSONContent } from '@tiptap/core'
	import type { ApiPost, PostFormTag as Tag } from './post-types'
	import { useAutoSave } from './useAutoSave.svelte'

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

	// O(1) dirty tracking: editVersion bumps on any tracked field change; savedVersion is captured at save time.
	let editVersion = $state(0)
	let savedVersion = $state(0)
	let editVersionInitialized = false

	$effect(() => {
		// Subscribe to all editable fields. Reading them inside the effect registers them as dependencies,
		// so any change re-runs this and bumps editVersion.
		void title
		void postType
		void status
		void slug
		void excerpt
		void syndicationText
		void featuredImage
		void syndicateBluesky
		void syndicateMastodon
		void appendLink
		void content
		void tags
		if (editVersionInitialized) {
			editVersion++
		} else {
			editVersionInitialized = true
		}
	})

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

	let isDirty = $derived(editVersion > savedVersion)

	// Auto-save runs only for drafts (publishing has explicit syndication side effects we shouldn't trigger silently).
	// Pre-first-save it requires a real change so a blank /admin/posts/new doesn't post an empty post on mount.
	const autoSave = useAutoSave({
		enabled: () => status === 'draft',
		isDirty: () => isDirty,
		save: () => handleSave(status)
	})

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

	// Cmd+S keyboard shortcut. For drafts: flush the auto-save debounce. For published: trigger save directly.
	$effect(() => {
		function handleKeydown(e: KeyboardEvent) {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
				e.preventDefault()
				if (status === 'draft') {
					void autoSave.flush()
				} else {
					handleSave(status)
				}
			}
		}
		document.addEventListener('keydown', handleKeydown)
		return () => document.removeEventListener('keydown', handleKeydown)
	})

	// Flush pending auto-save when the window loses focus (matches Notion's behavior).
	$effect(() => {
		function handleBlur() {
			if (status === 'draft') void autoSave.flush()
		}
		window.addEventListener('blur', handleBlur)
		return () => window.removeEventListener('blur', handleBlur)
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
		if (!isDirty || navigation.type === 'leave' || !navigation.to) return

		const targetUrl = navigation.to.url.pathname

		// Drafts: try to flush auto-save silently, then continue. If the flush fails
		// (network, 409, etc), fall back to the unsaved-changes modal so we never drop edits silently.
		if (status === 'draft' && autoSave.state !== 'conflict') {
			navigation.cancel()
			autoSave.flush().then(
				() => {
					allowNavigation = true
					goto(targetUrl)
				},
				() => {
					// Save failed — keep the user on the page and surface the modal.
					pendingNavigationUrl = targetUrl
					showUnsavedChangesModal = true
				}
			)
			return
		}

		// Published / conflict: keep the existing unsaved-changes prompt.
		pendingNavigationUrl = targetUrl
		navigation.cancel()
		showUnsavedChangesModal = true
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

		// Apply the status transition BEFORE building the payload + capturing the version, so the
		// snapshot reflects everything we're about to submit. Drain the reactive scheduler to absorb
		// any $effect-driven bumps from the status write before we read editVersion.
		status = targetStatus
		flushSync()
		const submittingVersion = editVersion

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
			let postAwaitVersion: number
			if (id === null) {
				const created = await api.post<ApiPost>('/api/posts', postData)
				flushSync()
				postAwaitVersion = editVersion
				id = created.id
				updatedAt = created.updatedAt
				// Adopt the server-canonicalized slug (we may have submitted a generated `post-${Date.now()}`).
				if (slug !== created.slug) slug = created.slug
				slugManuallySet = true
				replaceState(`/admin/posts/${created.id}/edit`, {})
			} else {
				const saved = await api.put<ApiPost>(`/api/posts/${id}`, {
					...postData,
					updatedAt
				})
				flushSync()
				postAwaitVersion = editVersion
				if (saved) {
					updatedAt = saved.updatedAt
					// Don't sync slug back — server doesn't mutate slug, and syncing would clobber
					// a slug edit the user may have made during the in-flight save.
					slugManuallySet = true
				}
			}
			flushSync()
			// Fold post-await server-sync writes into savedVersion, but keep mid-await user keystrokes
			// (postAwaitVersion - submittingVersion) marked dirty so the next debounce picks them up.
			savedVersion = submittingVersion + (editVersion - postAwaitVersion)
		} catch (error) {
			console.error('Failed to save post:', error)
			throw error
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
				{#if status === 'draft'}
					<SaveStatus state={autoSave.state} onRetry={() => autoSave.flush()} />
				{/if}
				<StatusDropdown
					{status}
					onSave={(target) => {
						// If the user is publishing a dirty draft, flush any pending auto-save first so we publish on top of the latest saved snapshot.
						if (status === 'draft' && target !== 'draft' && isDirty) {
							void autoSave.flush().then(() => handleSave(target))
						} else {
							handleSave(target)
						}
					}}
					disabled={saving}
					isLoading={saving}
					hidePrimary={status === 'draft'}
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
					onSlugEdit={() => (slugManuallySet = true)}
				/>
			</div>

			{#if id !== null}
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
