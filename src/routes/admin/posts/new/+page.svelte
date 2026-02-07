<script lang="ts">
	import { page } from '$app/stores'
import { goto, beforeNavigate } from '$app/navigation'
import { api } from '$lib/admin/api'
	import { onMount } from 'svelte'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import Composer from '$lib/components/admin/composer'
	import PostMetadataPopover from '$lib/components/admin/PostMetadataPopover.svelte'
	import UnsavedChangesModal from '$lib/components/admin/UnsavedChangesModal.svelte'
	import PublishDropdown from '$lib/components/admin/PublishDropdown.svelte'
	import type { JSONContent } from '@tiptap/core'

	let saving = $state(false)

	let title = $state('')
	let postType = $state<'post' | 'essay'>('post')
	let status = $state<'draft' | 'published'>('draft')
	let slug = $state('')
	let slugManuallySet = $state(false)
	let excerpt = $state('')
	let content = $state<JSONContent>({ type: 'doc', content: [] })
	let tags = $state<string[]>([])
	let tagInput = $state('')
	let showMetadata = $state(false)
	let metadataButtonRef: HTMLButtonElement | undefined = $state.raw()
	let showUnsavedChangesModal = $state(false)
	let pendingNavigation = $state<Parameters<typeof beforeNavigate>[0] | null>(null)

	// Check if form has any content (unsaved changes for new post)
	let isDirty = $derived(
		title.trim() !== '' ||
		slug.trim() !== '' ||
		excerpt.trim() !== '' ||
		tags.length > 0 ||
		(content.content && content.content.length > 0)
	)

	// Auto-generate slug from title when title changes and slug hasn't been manually set
	$effect(() => {
		if (title && !slugManuallySet) {
			slug = title
				.toLowerCase()
				.replace(/[^a-z0-9\s]+/g, '') // Remove special characters but keep spaces
				.replace(/\s+/g, '-') // Replace spaces with dashes
				.replace(/^-+|-+$/g, '') // Remove leading/trailing dashes
		}
	})

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

	onMount(() => {
		// Get post type from URL params
		const type = $page.url.searchParams.get('type')
		if (type && ['post', 'essay'].includes(type)) {
			postType = type as typeof postType
		}

		// Check for draft content in sessionStorage
		const draftContent = sessionStorage.getItem('draft_content')
		if (draftContent) {
			try {
				content = JSON.parse(draftContent)
				sessionStorage.removeItem('draft_content') // Clean up after use
			} catch (e) {
				console.error('Failed to parse draft content:', e)
			}
		}
	})

	function addTag() {
		if (tagInput && !tags.includes(tagInput)) {
			tags = [...tags, tagInput]
			tagInput = ''
		}
	}

	function removeTag(tag: string) {
		tags = tags.filter((t) => t !== tag)
	}

	async function handleSave(publishStatus?: 'draft' | 'published') {
		saving = true
		const postData = {
			title: config?.showTitle ? title : null,
			slug: slug || `post-${Date.now()}`,
			type: postType, // No mapping needed anymore
			status: publishStatus || status,
			content: config?.showContent ? content : null,
			excerpt: postType === 'essay' ? excerpt : undefined,
			tags
		}

		try {
			const newPost = await api.post<{ id: number }>('/api/posts', postData)
			goto(`/admin/posts/${newPost.id}/edit`)
		} catch (error) {
			console.error('Failed to create post:', error)
		} finally {
			saving = false
		}
	}

	// Mock post object for metadata popover
	const mockPost = $derived({
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		publishedAt: null as string | null
	})

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
</script>

<svelte:head>
	<title>New Post - Admin @jedmund</title>
</svelte:head>

<AdminPage>
	{#snippet header()}
	<header>
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
						post={mockPost}
						{postType}
						triggerElement={metadataButtonRef}
						bind:slug
						bind:excerpt
						bind:tags
						bind:tagInput
						onAddTag={addTag}
						onRemoveTag={removeTag}
						onDelete={() => {}}
						onClose={() => (showMetadata = false)}
						onFieldUpdate={(key, _value) => {
							if (key === 'slug') {
								slugManuallySet = true
							}
						}}
					/>
				{/if}
			</div>
			<PublishDropdown
				onPublish={() => handleSave('published')}
				onSaveDraft={() => handleSave('draft')}
				disabled={saving}
				isLoading={saving}
			/>
		</div>
	</header>
	{/snippet}

	<div class="post-composer">
		<div class="main-content">
			{#if config?.showTitle}
				<input type="text" bind:value={title} placeholder="Title" class="title-input" />
			{/if}

			{#if config?.showContent}
				<div class="editor-wrapper">
					<Composer bind:data={content} placeholder="Start writing..." />
				</div>
			{/if}
		</div>
	</div>
</AdminPage>

<UnsavedChangesModal
	isOpen={showUnsavedChangesModal}
	onContinueEditing={handleContinueEditing}
	onLeave={handleLeaveWithoutSaving}
/>

<style lang="scss">
	@import '$styles/variables.scss';

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

	.btn {
		padding: $unit-2x $unit-3x;
		border: none;
		border-radius: 50px;
		font-size: 0.925rem;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		gap: $unit;

		&:disabled {
			opacity: 0.6;
			cursor: not-allowed;
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
	}

	.metadata-popover-container {
		position: relative;
	}
</style>
