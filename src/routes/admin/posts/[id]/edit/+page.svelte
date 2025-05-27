<script lang="ts">
	import { page } from '$app/stores'
	import { goto } from '$app/navigation'
	import { onMount } from 'svelte'
	import Page from '$lib/components/Page.svelte'
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
	let content: JSONContent = { type: 'doc', content: [] }
	let tags: string[] = []
	let tagInput = ''

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
				postType = post.type
				status = post.status
				slug = post.slug || ''
				excerpt = post.excerpt || ''
				linkUrl = post.link_url || ''
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

	async function handleSave() {
		const auth = localStorage.getItem('admin_auth')
		if (!auth) {
			goto('/admin/login')
			return
		}

		saving = true
		const postData = {
			title,
			slug,
			type: postType,
			status,
			content,
			excerpt: postType === 'blog' ? excerpt : undefined,
			link_url: postType === 'link' ? linkUrl : undefined,
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
</script>

<Page>
	<header slot="header">
		{#if !loading && post}
			<h1>Edit Post</h1>
			<div class="actions">
				<button class="btn btn-danger" on:click={handleDelete}>Delete</button>
				<button class="btn btn-secondary" on:click={() => goto('/admin/posts')}>Cancel</button>
				<button class="btn btn-primary" on:click={handleSave} disabled={saving}>
					{saving ? 'Saving...' : 'Save Changes'}
				</button>
			</div>
		{/if}
	</header>

	{#if loading}
		<div class="loading-container">
			<LoadingSpinner />
		</div>
	{:else if post}
		<div class="post-editor">
			<div class="form-section">
				<FormFieldWrapper label="Post Type" required>
					<select bind:value={postType} class="form-select">
						<option value="blog">📝 Blog Post</option>
						<option value="microblog">💭 Microblog</option>
						<option value="link">🔗 Link</option>
						<option value="photo">📷 Photo</option>
						<option value="album">🖼️ Photo Album</option>
					</select>
				</FormFieldWrapper>

				<FormField label="Title" bind:value={title} required />
				
				<FormField label="Slug" bind:value={slug} required />

				{#if postType === 'blog'}
					<FormFieldWrapper label="Excerpt">
						<textarea 
							bind:value={excerpt} 
							class="form-textarea"
							rows="3"
							placeholder="Brief description of the post..."
						/>
					</FormFieldWrapper>
				{/if}

				{#if postType === 'link'}
					<FormField label="Link URL" bind:value={linkUrl} type="url" required />
				{/if}

				<FormFieldWrapper label="Status">
					<select bind:value={status} class="form-select">
						<option value="draft">Draft</option>
						<option value="published">Published</option>
					</select>
				</FormFieldWrapper>

				<FormFieldWrapper label="Tags">
					<div class="tag-input-wrapper">
						<input
							type="text"
							bind:value={tagInput}
							on:keydown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
							placeholder="Add tags..."
							class="form-input"
						/>
						<button type="button" on:click={addTag} class="btn btn-secondary">Add</button>
					</div>
					{#if tags.length > 0}
						<div class="tags">
							{#each tags as tag}
								<span class="tag">
									{tag}
									<button on:click={() => removeTag(tag)}>×</button>
								</span>
							{/each}
						</div>
					{/if}
				</FormFieldWrapper>

				<div class="metadata">
					<p>Created: {new Date(post.created_at).toLocaleString()}</p>
					<p>Updated: {new Date(post.updated_at).toLocaleString()}</p>
					{#if post.published_at}
						<p>Published: {new Date(post.published_at).toLocaleString()}</p>
					{/if}
				</div>
			</div>

			{#if postType !== 'link'}
				<div class="editor-section">
					<h2>Content</h2>
					<Editor bind:data={content} />
				</div>
			{/if}
		</div>
	{:else}
		<div class="error">Post not found</div>
	{/if}
</Page>

<style lang="scss">
	.loading-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 400px;
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;

		h1 {
			font-size: 1.75rem;
			font-weight: 700;
			margin: 0;
			color: $grey-10;
			font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		}

		.actions {
			display: flex;
			gap: $unit-2x;
		}
	}

	.post-editor {
		display: grid;
		gap: 2rem;
		grid-template-columns: 1fr;
		width: 100%;
	}

	.form-section {
		display: grid;
		gap: 1.5rem;
		max-width: 600px;
	}

	.form-select,
	.form-input,
	.form-textarea {
		width: 100%;
		padding: $unit-2x $unit-3x;
		border: 1px solid $grey-80;
		border-radius: 8px;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		font-size: 1rem;
		background-color: $grey-90;

		&:focus {
			outline: none;
			border-color: $grey-50;
		}
	}

	.form-textarea {
		resize: vertical;
	}

	.tag-input-wrapper {
		display: flex;
		gap: 0.5rem;

		input {
			flex: 1;
		}
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.tag {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: $unit $unit-2x;
		background: $grey-80;
		border-radius: 20px;
		font-size: 0.875rem;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;

		button {
			background: none;
			border: none;
			color: $grey-40;
			cursor: pointer;
			padding: 0;
			font-size: 1.2em;
			line-height: 1;

			&:hover {
				color: $grey-10;
			}
		}
	}

	.metadata {
		font-size: 0.875rem;
		color: $grey-40;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;

		p {
			margin: $unit-half 0;
		}
	}

	.editor-section {
		width: 100%;
		min-width: 0; // Prevent overflow
		
		h2 {
			margin-bottom: 1rem;
		}
	}

	.btn {
		padding: $unit-2x $unit-3x;
		border: none;
		border-radius: 50px;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		font-size: 0.925rem;
		cursor: pointer;
		transition: all 0.2s ease;

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

		&.btn-secondary {
			background-color: $grey-80;
			color: $grey-10;

			&:hover:not(:disabled) {
				background-color: $grey-60;
			}
		}

		&.btn-danger {
			background-color: #dc2626;
			color: white;

			&:hover:not(:disabled) {
				background-color: #b91c1c;
			}
		}
	}

	.error {
		text-align: center;
		color: var(--color-text-secondary);
		padding: 2rem;
	}
</style>