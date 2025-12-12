<script lang="ts">
	import { goto } from '$app/navigation'
	import AdminPage from './AdminPage.svelte'
	import AdminSegmentedControl from './AdminSegmentedControl.svelte'
	import Editor from './Editor.svelte'
	import Button from './Button.svelte'
	import Input from './Input.svelte'
	import DropdownSelectField from './DropdownSelectField.svelte'
	import { toast } from '$lib/stores/toast'
	import type { JSONContent } from '@tiptap/core'

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
	let hasLoaded = $state(mode === 'create')
	let isSaving = $state(false)
	let activeTab = $state('metadata')

	// Form data
	let title = $state(initialData?.title || '')
	let slug = $state(initialData?.slug || '')
	let content = $state<JSONContent>(initialData?.content || { type: 'doc', content: [] })
	let tags = $state<string[]>(initialData?.tags || [])
	let status = $state<'draft' | 'published'>(initialData?.status || 'draft')
	let tagInput = $state('')

	// Ref to the editor component
	let editorRef: { save: () => Promise<JSONContent> } | undefined

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

	// Mark as loaded for edit mode
	$effect(() => {
		if (mode === 'edit' && initialData && !hasLoaded) {
			hasLoaded = true
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

		isSaving = true
		const loadingToastId = toast.loading(`${mode === 'edit' ? 'Saving' : 'Creating'} essay...`)

		try {
			const payload = {
				title,
				slug,
				type: 'essay',
				status,
				content,
				tags,
				updatedAt: mode === 'edit' ? initialData?.updatedAt : undefined
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
			<Button
				variant="primary"
				onclick={handleSave}
				disabled={isSaving}
			>
				{isSaving ? 'Saving...' : 'Save'}
			</Button>
		</div>
	</header>

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
