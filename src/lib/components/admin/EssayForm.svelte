<script lang="ts">
	import { goto } from '$app/navigation'
	import AdminPage from './AdminPage.svelte'
	import AdminSegmentedControl from './AdminSegmentedControl.svelte'
	import Editor from './Editor.svelte'
	import Button from './Button.svelte'
	import Input from './Input.svelte'
	import type { JSONContent } from '@tiptap/core'

	interface Props {
		postId?: number
		initialData?: {
			title: string
			slug: string
			content: JSONContent
			tags: string[]
			status: 'draft' | 'published'
		}
		mode: 'create' | 'edit'
	}

	let { postId, initialData, mode }: Props = $props()

	// State
	let isLoading = $state(false)
	let isSaving = $state(false)
	let error = $state('')
	let successMessage = $state('')
	let activeTab = $state('metadata')
	let showPublishMenu = $state(false)

	// Form data
	let title = $state(initialData?.title || '')
	let slug = $state(initialData?.slug || '')
	let content = $state<JSONContent>(initialData?.content || { type: 'doc', content: [] })
	let tags = $state<string[]>(initialData?.tags || [])
	let status = $state<'draft' | 'published'>(initialData?.status || 'draft')
	let tagInput = $state('')

	// Ref to the editor component
	let editorRef: any

	const tabOptions = [
		{ value: 'metadata', label: 'Metadata' },
		{ value: 'content', label: 'Content' }
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
			error = 'Title is required'
			return
		}

		try {
			isSaving = true
			error = ''
			successMessage = ''

			const auth = localStorage.getItem('admin_auth')
			if (!auth) {
				goto('/admin/login')
				return
			}

			const payload = {
				title,
				slug,
				postType: 'blog', // 'blog' is the database value for essays
				status,
				content,
				tags
			}

			const url = mode === 'edit' ? `/api/posts/${postId}` : '/api/posts'
			const method = mode === 'edit' ? 'PUT' : 'POST'

			const response = await fetch(url, {
				method,
				headers: {
					Authorization: `Basic ${auth}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload)
			})

			if (!response.ok) {
				throw new Error(`Failed to ${mode === 'edit' ? 'save' : 'create'} essay`)
			}

			const savedPost = await response.json()
			successMessage = `Essay ${mode === 'edit' ? 'saved' : 'created'} successfully!`

			setTimeout(() => {
				successMessage = ''
				if (mode === 'create') {
					goto(`/admin/posts/${savedPost.id}/edit`)
				}
			}, 1500)
		} catch (err) {
			error = `Failed to ${mode === 'edit' ? 'save' : 'create'} essay`
			console.error(err)
		} finally {
			isSaving = false
		}
	}

	async function handlePublish() {
		status = 'published'
		await handleSave()
		showPublishMenu = false
	}

	async function handleUnpublish() {
		status = 'draft'
		await handleSave()
		showPublishMenu = false
	}

	function togglePublishMenu() {
		showPublishMenu = !showPublishMenu
	}

	// Close menu when clicking outside
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement
		if (!target.closest('.save-actions')) {
			showPublishMenu = false
		}
	}

	$effect(() => {
		if (showPublishMenu) {
			document.addEventListener('click', handleClickOutside)
			return () => {
				document.removeEventListener('click', handleClickOutside)
			}
		}
	})
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
		</div>
		<div class="header-center">
			<AdminSegmentedControl
				options={tabOptions}
				value={activeTab}
				onChange={(value) => (activeTab = value)}
			/>
		</div>
		<div class="header-actions">
			<div class="save-actions">
				<Button variant="primary" onclick={handleSave} disabled={isSaving} class="save-button">
					{isSaving ? 'Saving...' : status === 'published' ? 'Save' : 'Save Draft'}
				</Button>
				<Button
					variant="primary"
					iconOnly
					buttonSize="medium"
					active={showPublishMenu}
					onclick={togglePublishMenu}
					disabled={isSaving}
					class="chevron-button"
				>
					<svg
						slot="icon"
						width="12"
						height="12"
						viewBox="0 0 12 12"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M3 4.5L6 7.5L9 4.5"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</Button>
				{#if showPublishMenu}
					<div class="publish-menu">
						{#if status === 'published'}
							<Button variant="ghost" onclick={handleUnpublish} class="menu-item" fullWidth>
								Unpublish
							</Button>
						{:else}
							<Button variant="ghost" onclick={handlePublish} class="menu-item" fullWidth>
								Publish
							</Button>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</header>

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
							<Input label="Title" size="jumbo" bind:value={title} required placeholder="Essay title" />

							<Input label="Slug" bind:value={slug} placeholder="essay-url-slug" />

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
		background-color: $grey-10;

		&:hover:not(:disabled) {
			background-color: $grey-20;
		}

		&:active:not(:disabled) {
			background-color: $grey-30;
		}
	}

	.save-button {
		border-top-right-radius: 0;
		border-bottom-right-radius: 0;
		padding-right: $unit-2x;
	}

	:global(.chevron-button.btn-primary) {
		background-color: $grey-10;

		&:hover:not(:disabled) {
			background-color: $grey-20;
		}

		&:active:not(:disabled) {
			background-color: $grey-30;
		}

		&.active {
			background-color: $grey-20;
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
			color: $grey-20;
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
		background: $grey-90;
		border-radius: 20px;
		font-size: 0.875rem;
		color: $grey-20;

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
