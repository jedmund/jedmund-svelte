<script lang="ts">
	import { goto } from '$app/navigation'
	import Page from '$lib/components/Page.svelte'
	import FormField from '$lib/components/admin/FormField.svelte'
	import FormFieldWrapper from '$lib/components/admin/FormFieldWrapper.svelte'
	import Editor from '$lib/components/admin/Editor.svelte'
	import type { JSONContent } from '@tiptap/core'

	let title = ''
	let postType: 'blog' | 'microblog' | 'link' | 'photo' | 'album' = 'blog'
	let status: 'draft' | 'published' = 'draft'
	let slug = ''
	let excerpt = ''
	let linkUrl = ''
	let content: JSONContent = { type: 'doc', content: [] }
	let tags: string[] = []
	let tagInput = ''

	$: {
		// Auto-generate slug from title
		if (title && !slug) {
			slug = title
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-+|-+$/g, '')
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

	async function handleSubmit() {
		const auth = localStorage.getItem('admin_auth')
		if (!auth) {
			goto('/admin/login')
			return
		}

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
			const response = await fetch('/api/posts', {
				method: 'POST',
				headers: { 
					'Content-Type': 'application/json',
					'Authorization': `Basic ${auth}`
				},
				body: JSON.stringify(postData)
			})

			if (response.ok) {
				const post = await response.json()
				goto(`/admin/posts/${post.id}/edit`)
			}
		} catch (error) {
			console.error('Failed to create post:', error)
		}
	}
</script>

<Page>
	<header slot="header">
		<h1>New Post</h1>
		<div class="actions">
			<button class="btn btn-secondary" on:click={() => goto('/admin/posts')}>Cancel</button>
			<button class="btn btn-primary" on:click={handleSubmit}>Create Post</button>
		</div>
	</header>

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
	</div>

	{#if postType !== 'link'}
		<div class="editor-section">
			<h2>Content</h2>
			<Editor bind:data={content} />
		</div>
	{/if}
</div>
</Page>

<style lang="scss">
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;

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

		&.btn-primary {
			background-color: $grey-10;
			color: white;

			&:hover {
				background-color: $grey-20;
			}
		}

		&.btn-secondary {
			background-color: $grey-80;
			color: $grey-10;

			&:hover {
				background-color: $grey-60;
			}
		}
	}
</style>