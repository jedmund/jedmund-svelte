<script lang="ts">
	import { goto } from '$app/navigation'
	import AdminPage from './AdminPage.svelte'
	import AdminSegmentedControl from './AdminSegmentedControl.svelte'
	import Editor from './Editor.svelte'
	import Button from './Button.svelte'
	import Input from './Input.svelte'
	import DropdownSelectField from './DropdownSelectField.svelte'
	import DraftPrompt from './DraftPrompt.svelte'
	import { toast } from '$lib/stores/toast'
	import { makeDraftKey, saveDraft, clearDraft } from '$lib/admin/draftStore'
	import { createAutoSaveStore } from '$lib/admin/autoSave.svelte'
	import { useDraftRecovery } from '$lib/admin/useDraftRecovery.svelte'
	import { useFormGuards } from '$lib/admin/useFormGuards.svelte'
	import AutoSaveStatus from './AutoSaveStatus.svelte'
	import type { JSONContent } from '@tiptap/core'
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
	let hasLoaded = $state(mode === 'create') // Create mode loads immediately
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

	// Draft key for autosave fallback
	const draftKey = $derived(mode === 'edit' && postId ? makeDraftKey('post', postId) : null)

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
	const autoSave = mode === 'edit' && postId
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

	// Draft recovery helper
	const draftRecovery = useDraftRecovery<ReturnType<typeof buildPayload>>({
		draftKey: () => draftKey,
		onRestore: (payload) => {
			title = payload.title ?? title
			slug = payload.slug ?? slug
			status = payload.status ?? status
			content = payload.content ?? content
			tags = payload.tags ?? tags
		}
	})

	// Form guards (navigation protection, Cmd+S, beforeunload)
	useFormGuards(autoSave)

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
		void title; void slug; void status; void content; void tags; void activeTab
		if (hasLoaded && autoSave) {
			autoSave.schedule()
		}
	})

	// Save draft only when autosave fails
	$effect(() => {
		if (hasLoaded && autoSave && draftKey) {
			const saveStatus = autoSave.status
			if (saveStatus === 'error' || saveStatus === 'offline') {
				saveDraft(draftKey, buildPayload())
			}
		}
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

	{#if draftRecovery.showPrompt}
		<DraftPrompt
			timeAgo={draftRecovery.draftTimeText}
			onRestore={draftRecovery.restore}
			onDismiss={draftRecovery.dismiss}
		/>
	{/if}

	<div class="admin-container">
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
								<div class="input-label">Tags</div>
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
