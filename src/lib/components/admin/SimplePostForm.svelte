<script lang="ts">
	import { goto, beforeNavigate } from '$app/navigation'
	import AdminPage from './AdminPage.svelte'
	import type { JSONContent } from '@tiptap/core'
	import Editor from './Editor.svelte'
	import Button from './Button.svelte'
	import Input from './Input.svelte'
	import { toast } from '$lib/stores/toast'
	import { makeDraftKey, saveDraft, loadDraft, clearDraft, timeAgo } from '$lib/admin/draftStore'
	import { createAutoSaveStore } from '$lib/admin/autoSave.svelte'
	import AutoSaveStatus from './AutoSaveStatus.svelte'

	interface Props {
		postType: 'post'
		postId?: number
		initialData?: {
			title?: string
			content?: JSONContent
			linkUrl?: string
			linkDescription?: string
			status: 'draft' | 'published'
			updatedAt?: string
		}
		mode: 'create' | 'edit'
	}

let { postType, postId, initialData, mode }: Props = $props()

	// State
	let isSaving = $state(false)
	let hasLoaded = $state(mode === 'create')
	let status = $state<'draft' | 'published'>(initialData?.status || 'draft')
	let updatedAt = $state<string | undefined>(initialData?.updatedAt)

	// Form data
	let content = $state<JSONContent>(initialData?.content || { type: 'doc', content: [] })
	let linkUrl = $state(initialData?.linkUrl || '')
	let linkDescription = $state(initialData?.linkDescription || '')
	let title = $state(initialData?.title || '')

// Character count for posts
	const maxLength = 280
	const textContent = $derived.by(() => {
		if (!content.content) return ''
		return content.content
			.map((node: any) => node.content?.map((n: any) => n.text || '').join('') || '')
			.join('\n')
	})
	const charCount = $derived(textContent.length)
	const isOverLimit = $derived(charCount > maxLength)

	// Check if form has content
const hasContent = $derived.by(() => {
		// For posts, check if either content exists or it's a link with URL
		const hasTextContent = textContent.trim().length > 0
		const hasLinkContent = linkUrl && linkUrl.trim().length > 0
		return hasTextContent || hasLinkContent
})

// Draft backup
const draftKey = $derived(makeDraftKey('post', postId ?? 'new'))
let showDraftPrompt = $state(false)
let draftTimestamp = $state<number | null>(null)
let timeTicker = $state(0)
const draftTimeText = $derived.by(() => (draftTimestamp ? (timeTicker, timeAgo(draftTimestamp)) : null))

function buildPayload() {
  const payload: any = {
    type: 'post',
    status,
    content,
    updatedAt
  }
  if (linkUrl && linkUrl.trim()) {
    payload.title = title || linkUrl
    payload.link_url = linkUrl
    payload.linkDescription = linkDescription
  } else if (title) {
    payload.title = title
  }
  return payload
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
			onSaved: (saved: any, { prime }) => {
				updatedAt = saved.updatedAt
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
	status; content; linkUrl; linkDescription; title
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
  const draft = loadDraft<any>(draftKey)
  if (draft) {
    showDraftPrompt = true
    draftTimestamp = draft.ts
  }
})

function restoreDraft() {
  const draft = loadDraft<any>(draftKey)
  if (!draft) return
  const p = draft.payload
  status = p.status ?? status
  content = p.content ?? content
  if (p.link_url) {
    linkUrl = p.link_url
    linkDescription = p.linkDescription ?? linkDescription
    title = p.title ?? title
  } else {
    title = p.title ?? title
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
beforeNavigate(async (navigation) => {
	if (hasLoaded && autoSave) {
		if (autoSave.status === 'saved') {
			return
		}
		navigation.cancel()
		try {
			await autoSave.flush()
			// Navigate to the intended destination after flush completes
			if (navigation.to?.url) {
				goto(navigation.to.url.pathname + navigation.to.url.search)
			}
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

	async function handleSave(publishStatus: 'draft' | 'published') {
		if (isOverLimit) {
			toast.error('Post is too long')
			return
		}

		// For link posts, URL is required
		if (linkUrl && !linkUrl.trim()) {
			toast.error('Link URL is required')
			return
		}

		const loadingToastId = toast.loading(
			`${publishStatus === 'published' ? 'Publishing' : 'Saving'} post...`
		)

		try {
			isSaving = true

			const payload: any = {
				type: 'post', // Use simplified post type
				status: publishStatus,
				content: content
			}

			// Add link fields if they're provided
			if (linkUrl && linkUrl.trim()) {
				payload.title = title || linkUrl
				payload.link_url = linkUrl
				payload.linkDescription = linkDescription
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
				throw new Error(`Failed to ${mode === 'edit' ? 'save' : 'create'} post`)
			}

    const savedPost = await response.json()

    toast.dismiss(loadingToastId)
    toast.success(`Post ${publishStatus === 'published' ? 'published' : 'saved'} successfully!`)
    clearDraft(draftKey)

			// Redirect back to posts list after creation
			goto('/admin/posts')
		} catch (err) {
			toast.dismiss(loadingToastId)
			toast.error(`Failed to ${mode === 'edit' ? 'save' : 'create'} post`)
			console.error(err)
		} finally {
			isSaving = false
		}
	}
</script>

<AdminPage>
	<header slot="header">
		<div class="header-left">
			<Button variant="ghost" iconOnly onclick={() => goto('/admin/posts')}>
				<svg slot="icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
					<path
						d="M12.5 15L7.5 10L12.5 5"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</Button>
			<h1>
				{#if postType === 'microblog'}
					New Post
				{:else}
					Share Link
				{/if}
			</h1>
		</div>
		<div class="header-actions">
			{#if mode === 'edit' && autoSave}
				<AutoSaveStatus status={autoSave.status} error={autoSave.lastError} />
			{/if}
			<Button variant="secondary" onclick={() => handleSave('draft')} disabled={isSaving}>
				Save Draft
			</Button>
			<Button
				variant="primary"
				onclick={() => handleSave('published')}
				disabled={isSaving || !hasContent() || (postType === 'microblog' && isOverLimit)}
			>
				Post
			</Button>
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

	<div class="composer-container">
		<div class="composer">
			{#if postType === 'microblog'}
				<div class="post-composer">
					<Editor
						bind:data={content}
						placeholder="What's on your mind?"
						minHeight={120}
						autofocus={true}
						class="simple-editor"
						simpleMode={true}
					/>
					<div class="composer-footer">
						<span class="char-count" class:over-limit={isOverLimit}>
							{charCount} / {maxLength}
						</span>
					</div>
				</div>
			{:else if postType === 'link'}
				<div class="link-composer">
					<Input
						type="url"
						bind:value={linkUrl}
						placeholder="https://example.com"
						inputClass="link-input"
						required
						autofocus
					/>
					<input
						type="text"
						bind:value={title}
						placeholder="Link title (optional)"
						class="title-input"
					/>
					<Input
						type="textarea"
						bind:value={linkDescription}
						placeholder="Why is this interesting?"
						inputClass="description-input"
						rows={4}
					/>
				</div>
			{/if}
		</div>
	</div>
</AdminPage>

<style lang="scss">
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		gap: $unit-2x;

		.header-left {
			display: flex;
			align-items: center;
			gap: $unit-2x;

			h1 {
				font-size: 1.5rem;
				font-weight: 700;
				margin: 0;
				color: $gray-10;
			}
		}

		.header-actions {
			display: flex;
			gap: $unit-2x;
		}
	}

	.composer-container {
		max-width: 600px;
		margin: 0 auto;
		padding: $unit-3x;
	}

	.error-message {
		padding: $unit-2x;
		border-radius: $unit;
		margin-bottom: $unit-3x;
		background-color: #fee;
		color: #d33;
		font-size: 0.875rem;
	}

	.composer {
		background: white;
		border-radius: $unit-2x;
		overflow: hidden;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.post-composer {
		padding: $unit-3x;

		:global(.simple-editor) {
			font-size: 1.125rem;
			line-height: 1.5;

			:global(.tiptap) {
				min-height: 120px;

				&:focus {
					outline: none;
				}
			}
		}
	}

	.composer-footer {
		display: flex;
		justify-content: flex-end;
		margin-top: $unit-2x;
		padding-top: $unit-2x;
		border-top: 1px solid $gray-80;
	}

	.char-count {
		font-size: 0.875rem;
		color: $gray-50;

		&.over-limit {
			color: $red-60;
			font-weight: 600;
		}
	}

	.link-composer {
		display: flex;
		flex-direction: column;

		:global(.input-wrapper) {
			border-radius: 0;

			&:first-child {
				border-bottom: 1px solid $gray-90;
			}

			&:last-child {
				border-top: 1px solid $gray-90;
			}
		}

		:global(.link-input) {
			font-size: 1.125rem;
			font-weight: 500;
			color: $primary-color;
			padding: $unit-3x;
			border: none;
			border-radius: 0;
			background: transparent;

			&:focus {
				border: none;
				background: $gray-97;
			}
		}

		:global(.description-input) {
			font-size: 1rem;
			line-height: 1.5;
			color: $gray-20;
			padding: $unit-3x;
			border: none;
			border-radius: 0;
			background: transparent;
			min-height: 100px;

			&:focus {
				border: none;
				background: $gray-97;
			}
		}
	}

	.title-input {
		width: 100%;
		padding: $unit-4x;
		border: none;
		background: transparent;
		font-size: 1rem;
		color: $gray-10;
		border-bottom: 1px solid $gray-90;

		&:focus {
			outline: none;
			background: $gray-97;
		}

		&::placeholder {
			color: $gray-60;
		}
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
</style>
