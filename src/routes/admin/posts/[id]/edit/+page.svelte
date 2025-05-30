<script lang="ts">
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { onMount } from 'svelte'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import FormField from '$lib/components/admin/FormField.svelte'
	import FormFieldWrapper from '$lib/components/admin/FormFieldWrapper.svelte'
	import Editor from '$lib/components/admin/Editor.svelte'
	import LoadingSpinner from '$lib/components/admin/LoadingSpinner.svelte'
	import type { JSONContent } from '@tiptap/core'

	let post: any = null
	let loading = true
	let saving = false

	let title = ''
	let postType: 'blog' | 'microblog' | 'link' | 'photo' | 'album' = 'blog'
	let status: 'draft' | 'published' = 'draft'
	let slug = ''
	let excerpt = ''
	let linkUrl = ''
	let linkDescription = ''
	let content: JSONContent = { type: 'doc', content: [] }
	let tags: string[] = []
	let tagInput = ''
	let showMetadata = false
	let isPublishDropdownOpen = false
	let publishButtonRef: HTMLButtonElement

	const postTypeConfig = {
		blog: { icon: '📝', label: 'Blog Post', showTitle: true, showContent: true },
		microblog: { icon: '💭', label: 'Microblog', showTitle: false, showContent: true },
		link: { icon: '🔗', label: 'Link', showTitle: true, showContent: false },
		photo: { icon: '📷', label: 'Photo', showTitle: true, showContent: false },
		album: { icon: '🖼️', label: 'Album', showTitle: true, showContent: false }
	}
	
	let config = $derived(postTypeConfig[postType])

	onMount(async () => {
		await loadPost()
	})

	async function loadPost() {
		const auth = localStorage.getItem('admin_auth')
		if (!auth) {
			goto('/admin/login')
			return
		}

		try {
			const response = await fetch(`/api/posts/${$page.params.id}`, {
				headers: { Authorization: `Basic ${auth}` }
			})
			if (response.ok) {
				post = await response.json()
				// Populate form fields
				title = post.title || ''
				postType = post.type || post.postType
				status = post.status
				slug = post.slug || ''
				excerpt = post.excerpt || ''
				linkUrl = post.link_url || post.linkUrl || ''
				linkDescription = post.link_description || post.linkDescription || ''
				content = post.content || { type: 'doc', content: [] }
				tags = post.tags || []
			}
		} catch (error) {
			console.error('Failed to load post:', error)
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
		tags = tags.filter(t => t !== tag)
	}

	async function handleSave(publishStatus?: 'draft' | 'published') {
		const auth = localStorage.getItem('admin_auth')
		if (!auth) {
			goto('/admin/login')
			return
		}

		saving = true
		const postData = {
			title: config.showTitle ? title : null,
			slug,
			type: postType,
			status: publishStatus || status,
			content: config.showContent ? content : null,
			excerpt: postType === 'blog' ? excerpt : undefined,
			link_url: postType === 'link' ? linkUrl : undefined,
			link_description: postType === 'link' ? linkDescription : undefined,
			tags
		}

		try {
			const response = await fetch(`/api/posts/${$page.params.id}`, {
				method: 'PUT',
				headers: { 
					'Content-Type': 'application/json',
					'Authorization': `Basic ${auth}`
				},
				body: JSON.stringify(postData)
			})

			if (response.ok) {
				post = await response.json()
				if (publishStatus) {
					status = publishStatus
				}
			}
		} catch (error) {
			console.error('Failed to save post:', error)
		} finally {
			saving = false
		}
	}

	async function handleDelete() {
		if (!confirm('Are you sure you want to delete this post?')) return

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
				goto('/admin/posts')
			}
		} catch (error) {
			console.error('Failed to delete post:', error)
		}
	}
	
	function handlePublishDropdown(event: MouseEvent) {
		if (!publishButtonRef?.contains(event.target as Node)) {
			isPublishDropdownOpen = false
		}
	}
	
	$effect(() => {
		if (isPublishDropdownOpen) {
			document.addEventListener('click', handlePublishDropdown)
			return () => document.removeEventListener('click', handlePublishDropdown)
		}
	})
</script>

<AdminPage>
	<header slot="header">
		{#if !loading && post}
			<div class="header-left">
				<button class="btn-icon" onclick={() => goto('/admin/posts')}>
					<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
						<path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</button>
				<h1>{config.icon} Edit {config.label}</h1>
			</div>
			<div class="header-actions">
				<button class="btn btn-text" onclick={handleDelete}>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
						<path d="M4 4L12 12M4 12L12 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
					Delete
				</button>
				<button class="btn btn-text" onclick={() => showMetadata = !showMetadata}>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
						<path d="M8 4V8L10 10M14 8C14 11.3137 11.3137 14 8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2C11.3137 2 8 4.68629 8 8Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
					Metadata
				</button>
				{#if status === 'draft'}
					<div class="publish-dropdown">
						<button 
							bind:this={publishButtonRef}
							class="btn btn-primary"
							onclick={(e) => { e.stopPropagation(); isPublishDropdownOpen = !isPublishDropdownOpen }}
							disabled={saving}
						>
							{saving ? 'Saving...' : 'Publish'}
							<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
								<path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
							</svg>
						</button>
						{#if isPublishDropdownOpen}
							<div class="dropdown-menu">
								<button class="dropdown-item" onclick={() => handleSave('published')}>
									<span>Publish now</span>
								</button>
								<button class="dropdown-item" onclick={() => handleSave('draft')}>
									<span>Keep as draft</span>
								</button>
							</div>
						{/if}
					</div>
				{:else}
					<button class="btn btn-primary" onclick={() => handleSave()} disabled={saving}>
						{saving ? 'Saving...' : 'Save Changes'}
					</button>
				{/if}
			</div>
		{/if}
	</header>

	{#if loading}
		<div class="loading-container">
			<LoadingSpinner />
		</div>
	{:else if post}
		<div class="post-composer">
			<div class="main-content">
				{#if config.showTitle}
					<input
						type="text"
						bind:value={title}
						placeholder="Title"
						class="title-input"
					/>
				{/if}
				
				{#if postType === 'link'}
					<div class="link-fields">
						<input
							type="url"
							bind:value={linkUrl}
							placeholder="https://example.com"
							class="link-url-input"
							required
						/>
						<textarea 
							bind:value={linkDescription} 
							class="link-description"
							rows="3"
							placeholder="What makes this link interesting?"
						/>
					</div>
				{:else if postType === 'photo'}
					<div class="photo-upload">
						<div class="photo-placeholder">
							<svg width="48" height="48" viewBox="0 0 48 48" fill="none">
								<path d="M40 14H31.5L28 10H20L16.5 14H8C5.8 14 4 15.8 4 18V34C4 36.2 5.8 38 8 38H40C42.2 38 44 36.2 44 34V18C44 15.8 42.2 14 40 14ZM24 32C19.6 32 16 28.4 16 24C16 19.6 19.6 16 24 16C28.4 16 32 19.6 32 24C32 28.4 28.4 32 24 32Z" fill="currentColor" opacity="0.1"/>
								<path d="M24 28C26.2091 28 28 26.2091 28 24C28 21.7909 26.2091 20 24 20C21.7909 20 20 21.7909 20 24C20 26.2091 21.7909 28 24 28Z" fill="currentColor" opacity="0.3"/>
							</svg>
							<p>Click to upload photo</p>
						</div>
					</div>
				{:else if postType === 'album'}
					<div class="album-upload">
						<div class="album-placeholder">
							<svg width="48" height="48" viewBox="0 0 48 48" fill="none">
								<rect x="8" y="8" width="24" height="24" rx="2" fill="currentColor" opacity="0.1"/>
								<rect x="16" y="16" width="24" height="24" rx="2" fill="currentColor" opacity="0.2"/>
								<path d="M16 24L20 20L24 24L32 16L40 24V38C40 39.1046 39.1046 40 38 40H18C16.8954 40 16 39.1046 16 38V24Z" fill="currentColor" opacity="0.3"/>
							</svg>
							<p>Click to upload photos</p>
							<span class="album-hint">Select multiple photos</span>
						</div>
					</div>
				{/if}
				
				{#if config.showContent}
					<div class="editor-wrapper">
						<Editor bind:data={content} placeholder="Continue writing..." />
					</div>
				{/if}
			</div>
			
			{#if showMetadata}
				<aside class="metadata-sidebar">
					<h3>Post Settings</h3>
					
					<FormField label="Slug" bind:value={slug} />
					
					{#if postType === 'blog'}
						<FormFieldWrapper label="Excerpt">
							<textarea 
								bind:value={excerpt} 
								class="form-textarea"
								rows="3"
								placeholder="Brief description..."
							/>
						</FormFieldWrapper>
					{/if}
					
					<FormFieldWrapper label="Tags">
						<div class="tag-input-wrapper">
							<input
								type="text"
								bind:value={tagInput}
								onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
								placeholder="Add tags..."
								class="form-input"
							/>
							<button type="button" onclick={addTag} class="btn btn-small">Add</button>
						</div>
						{#if tags.length > 0}
							<div class="tags">
								{#each tags as tag}
									<span class="tag">
										{tag}
										<button onclick={() => removeTag(tag)}>×</button>
									</span>
								{/each}
							</div>
						{/if}
					</FormFieldWrapper>
					
					<div class="metadata">
						<p>Created: {new Date(post.created_at || post.createdAt).toLocaleString()}</p>
						<p>Updated: {new Date(post.updated_at || post.updatedAt).toLocaleString()}</p>
						{#if post.published_at || post.publishedAt}
							<p>Published: {new Date(post.published_at || post.publishedAt).toLocaleString()}</p>
						{/if}
					</div>
				</aside>
			{/if}
		</div>
	{:else}
		<div class="error">Post not found</div>
	{/if}
</AdminPage>

<style lang="scss">
	@import '$styles/variables.scss';
	
	.loading-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 400px;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: $unit-2x;
		
		h1 {
			font-size: 1.5rem;
			font-weight: 700;
			margin: 0;
			color: $grey-10;
			font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		}
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
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		font-size: 0.875rem;
		transition: all 0.2s ease;
		
		&:hover {
			background: $grey-90;
			color: $grey-10;
		}
	}
	
	.publish-dropdown {
		position: relative;
	}
	
	.btn {
		padding: $unit-2x $unit-3x;
		border: none;
		border-radius: 50px;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
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
		
		&.btn-primary {
			background-color: $grey-10;
			color: white;
			
			&:hover:not(:disabled) {
				background-color: $grey-20;
			}
		}
		
		&.btn-small {
			padding: $unit $unit-2x;
			font-size: 0.875rem;
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
		z-index: 100;
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
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
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
		
		&:has(.metadata-sidebar) {
			grid-template-columns: 1fr 300px;
		}
	}
	
	.main-content {
		display: flex;
		flex-direction: column;
		gap: $unit-3x;
		min-width: 0;
	}
	
	.title-input {
		width: 100%;
		padding: 0;
		border: none;
		font-size: 2.5rem;
		font-weight: 700;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		color: $grey-10;
		background: none;
		
		&:focus {
			outline: none;
		}
		
		&::placeholder {
			color: $grey-60;
		}
	}
	
	.link-fields {
		display: flex;
		flex-direction: column;
		gap: $unit-2x;
	}
	
	.link-url-input {
		width: 100%;
		padding: $unit-2x $unit-3x;
		border: 1px solid $grey-80;
		border-radius: 8px;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		font-size: 1.125rem;
		background-color: $grey-95;
		
		&:focus {
			outline: none;
			border-color: $grey-50;
			background-color: white;
		}
	}
	
	.link-description {
		width: 100%;
		padding: $unit-2x $unit-3x;
		border: 1px solid $grey-80;
		border-radius: 8px;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		font-size: 1rem;
		background-color: $grey-95;
		resize: vertical;
		
		&:focus {
			outline: none;
			border-color: $grey-50;
			background-color: white;
		}
	}
	
	.photo-upload,
	.album-upload {
		width: 100%;
	}
	
	.photo-placeholder,
	.album-placeholder {
		border: 2px dashed $grey-80;
		border-radius: 12px;
		padding: $unit-8x;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: $unit-2x;
		cursor: pointer;
		transition: all 0.2s ease;
		background: $grey-95;
		
		&:hover {
			border-color: $grey-60;
			background: $grey-90;
		}
		
		svg {
			color: $grey-50;
		}
		
		p {
			margin: 0;
			color: $grey-30;
			font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		}
	}
	
	.album-hint {
		font-size: 0.875rem;
		color: $grey-50;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
	}
	
	.editor-wrapper {
		width: 100%;
		min-height: 400px;
	}
	
	.metadata-sidebar {
		background: $grey-95;
		border-radius: 12px;
		padding: $unit-3x;
		height: fit-content;
		position: sticky;
		top: $unit-3x;
		
		h3 {
			font-size: 1.125rem;
			font-weight: 600;
			margin: 0 0 $unit-3x;
			color: $grey-10;
			font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		}
		
		> * + * {
			margin-top: $unit-3x;
		}
	}
	
	.form-textarea {
		width: 100%;
		padding: $unit-2x;
		border: 1px solid $grey-80;
		border-radius: 8px;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		font-size: 0.875rem;
		background-color: white;
		resize: vertical;
		
		&:focus {
			outline: none;
			border-color: $grey-50;
		}
	}
	
	.form-input {
		width: 100%;
		padding: $unit $unit-2x;
		border: 1px solid $grey-80;
		border-radius: 8px;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		font-size: 0.875rem;
		background-color: white;
		
		&:focus {
			outline: none;
			border-color: $grey-50;
		}
	}
	
	.tag-input-wrapper {
		display: flex;
		gap: $unit;
		
		input {
			flex: 1;
		}
	}
	
	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: $unit;
		margin-top: $unit;
	}
	
	.tag {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px $unit-2x;
		background: $grey-80;
		border-radius: 20px;
		font-size: 0.75rem;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		
		button {
			background: none;
			border: none;
			color: $grey-40;
			cursor: pointer;
			padding: 0;
			font-size: 1rem;
			line-height: 1;
			
			&:hover {
				color: $grey-10;
			}
		}
	}
	
	.metadata {
		font-size: 0.75rem;
		color: $grey-40;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		
		p {
			margin: $unit-half 0;
		}
	}
	
	.error {
		text-align: center;
		color: $grey-40;
		padding: 2rem;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
	}
	
	@include breakpoint('phone') {
		.post-composer {
			grid-template-columns: 1fr;
		}
		
		.metadata-sidebar {
			position: static;
		}
	}
</style>