<script lang="ts">
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { onMount } from 'svelte'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import CaseStudyEditor from '$lib/components/admin/CaseStudyEditor.svelte'
	import LoadingSpinner from '$lib/components/admin/LoadingSpinner.svelte'
	import PostMetadataPopover from '$lib/components/admin/PostMetadataPopover.svelte'
	import DeleteConfirmationModal from '$lib/components/admin/DeleteConfirmationModal.svelte'
	import Button from '$lib/components/admin/Button.svelte'
	import StatusDropdown from '$lib/components/admin/StatusDropdown.svelte'
	import type { JSONContent } from '@tiptap/core'

	let post = $state<any>(null)
	let loading = $state(true)
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
	let metadataButtonRef: HTMLButtonElement
	let showDeleteConfirmation = $state(false)

	const postTypeConfig = {
		post: { icon: '💭', label: 'Post', showTitle: false, showContent: true },
		essay: { icon: '📝', label: 'Essay', showTitle: true, showContent: true }
	}

	let config = $derived(postTypeConfig[postType])

	// Convert blocks format (from database) to Tiptap format
	function convertBlocksToTiptap(blocksContent: any): JSONContent {
		if (!blocksContent || !blocksContent.blocks) {
			return { type: 'doc', content: [] }
		}

		const tiptapContent = blocksContent.blocks.map((block: any) => {
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
						content: (block.content || []).map((item: any) => ({
							type: 'listItem',
							content: [
								{
									type: 'paragraph',
									content: [{ type: 'text', text: item.content || item }]
								}
							]
						}))
					}

				case 'orderedList':
				case 'ol':
					return {
						type: 'orderedList',
						content: (block.content || []).map((item: any) => ({
							type: 'listItem',
							content: [
								{
									type: 'paragraph',
									content: [{ type: 'text', text: item.content || item }]
								}
							]
						}))
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
			content: tiptapContent
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

		const auth = localStorage.getItem('admin_auth')

		if (!auth) {
			goto('/admin/login')
			return
		}

		try {
			const response = await fetch(`/api/posts/${postId}`, {
				headers: { Authorization: `Basic ${auth}` }
			})

			if (response.ok) {
				post = await response.json()

				// Populate form fields
				title = post.title || ''
				postType = post.postType // No mapping needed anymore
				status = post.status || 'draft'
				slug = post.slug || ''
				excerpt = post.excerpt || ''

				// Convert blocks format to Tiptap format if needed
				if (post.content && post.content.blocks) {
					content = convertBlocksToTiptap(post.content)
				} else if (post.content && post.content.type === 'doc') {
					content = post.content
				} else {
					content = { type: 'doc', content: [] }
				}

				tags = post.tags || []

				// Set content ready after all data is loaded
				contentReady = true
			} else {
				if (response.status === 404) {
					loadError = 'Post not found'
				} else if (response.status === 401) {
					goto('/admin/login')
					return
				} else {
					loadError = `Failed to load post: ${response.status} ${response.statusText}`
				}
			}
		} catch (error) {
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
		const auth = localStorage.getItem('admin_auth')
		if (!auth) {
			goto('/admin/login')
			return
		}

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
			const response = await fetch(`/api/posts/${$page.params.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Basic ${auth}`
				},
				body: JSON.stringify(postData)
			})

			if (response.ok) {
				post = await response.json()
				if (newStatus) {
					status = newStatus
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
		const auth = localStorage.getItem('admin_auth')
		if (!auth) {
			goto('/admin/login')
			return
		}

		try {
			const response = await fetch(`/api/posts/${$page.params.id}`, {
				method: 'DELETE',
				headers: { Authorization: `Basic ${auth}` }
			})

			if (response.ok) {
				showDeleteConfirmation = false
				goto('/admin/posts')
			}
		} catch (error) {
			console.error('Failed to delete post:', error)
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
	<title>{post && post.title ? `${post.title} - Admin @jedmund` : 'Edit Post - Admin @jedmund'}</title>
</svelte:head>

<AdminPage>
	<header slot="header">
		{#if !loading && post}
			<div class="header-left">
				<button class="btn-icon" onclick={() => goto('/admin/posts')}>
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
					primaryAction={status === 'published'
						? { label: 'Save', status: 'published' }
						: { label: 'Publish', status: 'published' }}
					dropdownActions={[{ label: 'Save as Draft', status: 'draft', show: status !== 'draft' }]}
					viewUrl={slug ? `/universe/${slug}` : undefined}
				/>
			</div>
		{/if}
	</header>

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
						<CaseStudyEditor bind:data={content} placeholder="Continue writing..." mode="default" />
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
			color: $grey-20;
			margin: 0;
		}

		p {
			color: $grey-40;
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

	.btn-text {
		padding: $unit $unit-2x;
		border: none;
		background: none;
		color: $grey-40;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: $unit;
		border-radius: 8px;
		font-size: 0.875rem;
		transition: all 0.2s ease;

		&:hover {
			background: $grey-90;
			color: $grey-10;
		}
	}

	.dropdown-menu {
		position: absolute;
		top: calc(100% + $unit);
		right: 0;
		background: white;
		border: 1px solid $grey-80;
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		min-width: 150px;
		z-index: 1050;
		overflow: hidden;
	}

	.dropdown-item {
		width: 100%;
		padding: $unit-2x;
		border: none;
		background: none;
		cursor: pointer;
		text-align: left;
		transition: background 0.2s ease;
		font-size: 0.875rem;
		color: $grey-10;

		&:hover {
			background: $grey-95;
		}

		&:not(:last-child) {
			border-bottom: 1px solid $grey-90;
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
		color: $grey-10;
		background: none;

		&:focus {
			outline: none;
		}

		&::placeholder {
			color: $grey-60;
		}
	}

	.editor-wrapper {
		width: 100%;
		min-height: 400px;
	}

	.metadata-popover-container {
		position: relative;
	}

	.error {
		text-align: center;
		color: $grey-40;
		padding: 2rem;
	}
</style>
