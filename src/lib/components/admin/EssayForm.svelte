<script lang="ts">
	import { goto, beforeNavigate } from '$app/navigation'
	import AdminPage from './AdminPage.svelte'
	import AdminSegmentedControl from './AdminSegmentedControl.svelte'
	import Editor from './Editor.svelte'
	import Button from './Button.svelte'
	import Input from './Input.svelte'
	import DropdownSelectField from './DropdownSelectField.svelte'
	import { toast } from '$lib/stores/toast'
	import { makeDraftKey, saveDraft, loadDraft, clearDraft, timeAgo } from '$lib/admin/draftStore'
	import { createAutoSaveStore } from '$lib/admin/autoSave.svelte'
	import AutoSaveStatus from './AutoSaveStatus.svelte'
	import type { JSONContent, Editor as TipTapEditor } from '@tiptap/core'
	import type { Post } from '@prisma/client'

	interface Props {
		postId?: number
		initialData?: {
			title: string
			slug: string
			content: JSONContent
			tags: string[]
			status: 'draft' | 'published'
			updatedAt?: string
		}
		mode: 'create' | 'edit'
	}

	let { postId, initialData, mode }: Props = $props()

	// State
	let isLoading = $state(false)
	let hasLoaded = $state(mode === 'create') // Create mode loads immediately
	let isSaving = $state(false)
	let activeTab = $state('metadata')
	let updatedAt = $state<string | undefined>(initialData?.updatedAt)

	// Form data
	let title = $state(initialData?.title || '')
	let slug = $state(initialData?.slug || '')
	let content = $state<JSONContent>(initialData?.content || { type: 'doc', content: [] })
	let tags = $state<string[]>(initialData?.tags || [])
	let status = $state<'draft' | 'published'>(initialData?.status || 'draft')
	let tagInput = $state('')

	// Ref to the editor component
	let editorRef: { save: () => Promise<JSONContent> } | undefined

	// Draft backup
	const draftKey = $derived(makeDraftKey('post', postId ?? 'new'))
	let showDraftPrompt = $state(false)
	let draftTimestamp = $state<number | null>(null)
	let timeTicker = $state(0)
	const draftTimeText = $derived.by(() => (draftTimestamp ? (timeTicker, timeAgo(draftTimestamp)) : null))

function buildPayload() {
  return {
    title,
    slug,
    type: 'essay',
    status,
    content,
    tags,
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

	const tabOptions = [
		{ value: 'metadata', label: 'Metadata' },
		{ value: 'content', label: 'Content' }
	]

	const statusOptions = [
		{
			value: 'draft',
			label: 'Draft',
			description: 'Only visible to you'
		},
		{
			value: 'published',
			label: 'Published',
			description: 'Visible on your public site'
		}
	]

	// Auto-generate slug from title
$effect(() => {
  if (title && !slug) {
			slug = title
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-+|-+$/g, '')
		}
})

	// Prime autosave on initial load (edit mode only)
	$effect(() => {
		if (mode === 'edit' && initialData && !hasLoaded && autoSave) {
			autoSave.prime(buildPayload())
			hasLoaded = true
		}
	})

	// Trigger autosave when form data changes
	$effect(() => {
		title; slug; status; content; tags; activeTab
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

// Show restore prompt if a draft exists
$effect(() => {
  const draft = loadDraft<ReturnType<typeof buildPayload>>(draftKey)
  if (draft) {
    showDraftPrompt = true
    draftTimestamp = draft.ts
  }
})

	function restoreDraft() {
		const draft = loadDraft<ReturnType<typeof buildPayload>>(draftKey)
		if (!draft) return
		const p = draft.payload
		title = p.title ?? title
		slug = p.slug ?? slug
		status = p.status ?? status
		content = p.content ?? content
		tags = p.tags ?? tags
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

	function addTag() {
		if (tagInput && !tags.includes(tagInput)) {
			tags = [...tags, tagInput]
			tagInput = ''
		}
	}

	function removeTag(tag: string) {
		tags = tags.filter((t) => t !== tag)
	}

	function handleEditorChange(newContent: JSONContent) {
		content = newContent
	}

	async function handleSave() {
		// Check if we're on the content tab and should save editor content
		if (activeTab === 'content' && editorRef) {
			const editorData = await editorRef.save()
			if (editorData) {
				content = editorData
			}
		}

		if (!title) {
			toast.error('Title is required')
			return
		}

		const loadingToastId = toast.loading(`${mode === 'edit' ? 'Saving' : 'Creating'} essay...`)

		try {
			isSaving = true

			const payload = {
				title,
				slug,
				type: 'essay', // No mapping needed anymore
				status,
				content,
				tags
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
				throw new Error(`Failed to ${mode === 'edit' ? 'save' : 'create'} essay`)
			}

			const savedPost = await response.json()

			toast.dismiss(loadingToastId)
      toast.success(`Essay ${mode === 'edit' ? 'saved' : 'created'} successfully!`)
      clearDraft(draftKey)

			if (mode === 'create') {
				goto(`/admin/posts/${savedPost.id}/edit`)
			}
		} catch (err) {
			toast.dismiss(loadingToastId)
			toast.error(`Failed to ${mode === 'edit' ? 'save' : 'create'} essay`)
			console.error(err)
		} finally {
			isSaving = false
		}
	}

</script>

<AdminPage>
	<header slot="header">
		<div class="header-left">
			<h1 class="form-title">{title || 'Untitled Essay'}</h1>
		</div>
		<div class="header-center">
			<AdminSegmentedControl
				options={tabOptions}
				value={activeTab}
				onChange={(value) => (activeTab = value)}
			/>
		</div>
		<div class="header-actions">
			{#if mode === 'edit' && autoSave}
				<AutoSaveStatus
					status={autoSave.status}
					error={autoSave.lastError}
					lastSavedAt={initialData?.updatedAt}
				/>
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

	<div class="admin-container">
		{#if error}
			<div class="error-message">{error}</div>
		{/if}

		{#if successMessage}
			<div class="success-message">{successMessage}</div>
		{/if}

		<div class="tab-panels">
			<!-- Metadata Panel -->
			<div class="panel content-wrapper" class:active={activeTab === 'metadata'}>
				<div class="form-content">
					<form
						onsubmit={(e) => {
							e.preventDefault()
							handleSave()
						}}
					>
						<div class="form-section">
							<Input
								label="Title"
								size="jumbo"
								bind:value={title}
								required
								placeholder="Essay title"
							/>

							<Input label="Slug" bind:value={slug} placeholder="essay-url-slug" />

							<DropdownSelectField
								label="Status"
								bind:value={status}
								options={statusOptions}
							/>

							<div class="tags-field">
								<label class="input-label">Tags</label>
								<div class="tag-input-wrapper">
									<Input
										bind:value={tagInput}
										onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
										placeholder="Add tags..."
										wrapperClass="tag-input"
									/>
									<Button variant="secondary" buttonSize="small" type="button" onclick={addTag}>
										Add
									</Button>
								</div>
								{#if tags.length > 0}
									<div class="tags">
										{#each tags as tag}
											<span class="tag">
												{tag}
												<Button
													variant="ghost"
													iconOnly
													buttonSize="small"
													onclick={() => removeTag(tag)}
													aria-label="Remove {tag}"
												>
													×
												</Button>
											</span>
										{/each}
									</div>
								{/if}
							</div>
						</div>
					</form>
				</div>
			</div>

			<!-- Content Panel -->
			<div class="panel content-wrapper" class:active={activeTab === 'content'}>
				<div class="editor-content">
					<Editor
						bind:this={editorRef}
						bind:data={content}
						onChange={handleEditorChange}
						placeholder="Write your essay..."
						minHeight={400}
						autofocus={false}
						class="essay-editor"
					/>
				</div>
			</div>
		</div>
	</div>
</AdminPage>

<style lang="scss">
	header {
		display: grid;
		grid-template-columns: 250px 1fr 250px;
		align-items: center;
		width: 100%;
		gap: $unit-2x;

		.header-left {
			width: 250px;
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
		}
	}

	.form-title {
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

	.save-actions {
		position: relative;
		display: flex;
	}

	.draft-banner {
		background: $blue-95;
		border-bottom: 1px solid $blue-80;
		padding: $unit-2x $unit-5x;
		display: flex;
		justify-content: center;
		align-items: center;
		animation: slideDown 0.2s ease-out;

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
	}

	.draft-banner-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: $unit-3x;
		width: 100%;
		max-width: 1200px;
	}

	.draft-banner-text {
		color: $blue-20;
		font-size: $font-size-small;
		font-weight: $font-weight-med;
	}

	.draft-banner-actions {
		display: flex;
		gap: $unit-2x;
	}

	.draft-banner-button {
		background: $blue-50;
		border: none;
		color: $white;
		cursor: pointer;
		padding: $unit-half $unit-2x;
		border-radius: $corner-radius-sm;
		font-size: $font-size-small;
		font-weight: $font-weight-med;
		transition: background $transition-fast;

		&:hover {
			background: $blue-40;
		}

		&.dismiss {
			background: transparent;
			color: $blue-30;

			&:hover {
				background: $blue-90;
			}
		}
	}

	// Custom styles for save/publish buttons to maintain grey color scheme
	:global(.save-button.btn-primary) {
		background-color: $gray-10;

		&:hover:not(:disabled) {
			background-color: $gray-20;
		}

		&:active:not(:disabled) {
			background-color: $gray-30;
		}
	}

	.save-button {
		border-top-right-radius: 0;
		border-bottom-right-radius: 0;
		padding-right: $unit-2x;
	}

	:global(.chevron-button.btn-primary) {
		background-color: $gray-10;

		&:hover:not(:disabled) {
			background-color: $gray-20;
		}

		&:active:not(:disabled) {
			background-color: $gray-30;
		}

		&.active {
			background-color: $gray-20;
		}
	}

	.chevron-button {
		border-top-left-radius: 0;
		border-bottom-left-radius: 0;
		border-left: 1px solid rgba(255, 255, 255, 0.2);

		svg {
			transition: transform 0.2s ease;
		}

		&.active svg {
			transform: rotate(180deg);
		}
	}

	.publish-menu {
		position: absolute;
		top: 100%;
		right: 0;
		margin-top: $unit;
		background: white;
		border-radius: $unit;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		overflow: hidden;
		min-width: 120px;
		z-index: 100;

		.menu-item {
			text-align: left;
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

	.error-message,
	.success-message {
		padding: $unit-3x;
		border-radius: $unit;
		margin-bottom: $unit-4x;
		max-width: 700px;
		margin-left: auto;
		margin-right: auto;
	}

	.error-message {
		background-color: #fee;
		color: #d33;
	}

	.success-message {
		background-color: #efe;
		color: #363;
	}

	.form-section {
		margin-bottom: $unit-6x;

		&:last-child {
			margin-bottom: 0;
		}
	}

	.form-content {
		padding: $unit-4x;

		@include breakpoint('phone') {
			padding: $unit-3x;
		}
	}

	// Tags field styles
	.tags-field {
		margin-bottom: $unit-4x;

		.input-label {
			display: block;
			margin-bottom: $unit;
			font-size: 14px;
			font-weight: 500;
			color: $gray-20;
		}
	}

	.tag-input-wrapper {
		display: flex;
		gap: $unit;

		:global(.tag-input) {
			flex: 1;
		}
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: $unit;
		margin-top: $unit-2x;
	}

	.tag {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: $unit $unit-2x;
		background: $gray-90;
		border-radius: 20px;
		font-size: 0.875rem;
		color: $gray-20;

		:global(.btn) {
			margin-left: 4px;
			font-size: 1.125rem;
			line-height: 1;
		}
	}

	.editor-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		position: relative;

		:global(.essay-editor) {
			flex: 1;
			overflow: auto;
		}
	}
</style>
