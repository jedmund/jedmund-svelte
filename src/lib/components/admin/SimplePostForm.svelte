<script lang="ts">
	import { goto } from '$app/navigation'
	import AdminPage from './AdminPage.svelte'
	import type { JSONContent } from '@tiptap/core'
	import Editor from './Editor.svelte'
	import Button from './Button.svelte'
	import Input from './Input.svelte'

	interface Props {
		postType: 'post'
		postId?: number
		initialData?: {
			title?: string
			content?: JSONContent
			linkUrl?: string
			linkDescription?: string
			status: 'draft' | 'published'
		}
		mode: 'create' | 'edit'
	}

	let { postType, postId, initialData, mode }: Props = $props()

	// State
	let isSaving = $state(false)
	let error = $state('')
	let status = $state<'draft' | 'published'>(initialData?.status || 'draft')

	// Form data
	let content = $state<JSONContent>(initialData?.content || { type: 'doc', content: [] })
	let linkUrl = $state(initialData?.linkUrl || '')
	let linkDescription = $state(initialData?.linkDescription || '')
	let title = $state(initialData?.title || '')

	// Character count for posts
	const maxLength = 280
	const textContent = $derived(() => {
		if (!content.content) return ''
		return content.content
			.map((node: any) => node.content?.map((n: any) => n.text || '').join('') || '')
			.join('\n')
	})
	const charCount = $derived(textContent().length)
	const isOverLimit = $derived(charCount > maxLength)

	// Check if form has content
	const hasContent = $derived(() => {
		// For posts, check if either content exists or it's a link with URL
		const hasTextContent = textContent().trim().length > 0
		const hasLinkContent = linkUrl && linkUrl.trim().length > 0
		return hasTextContent || hasLinkContent
	})

	async function handleSave(publishStatus: 'draft' | 'published') {
		if (isOverLimit) {
			error = 'Post is too long'
			return
		}

		// For link posts, URL is required
		if (linkUrl && !linkUrl.trim()) {
			error = 'Link URL is required'
			return
		}

		try {
			isSaving = true
			error = ''

			const auth = localStorage.getItem('admin_auth')
			if (!auth) {
				goto('/admin/login')
				return
			}

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
					Authorization: `Basic ${auth}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload)
			})

			if (!response.ok) {
				throw new Error(`Failed to ${mode === 'edit' ? 'save' : 'create'} post`)
			}

			const savedPost = await response.json()

			// Redirect back to posts list after creation
			goto('/admin/posts')
		} catch (err) {
			error = `Failed to ${mode === 'edit' ? 'save' : 'create'} post`
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
			<Button variant="secondary" onclick={() => handleSave('draft')} disabled={isSaving}>
				Save Draft
			</Button>
			<Button
				variant="primary"
				onclick={() => handleSave('published')}
				disabled={isSaving || !hasContent() || (postType === 'microblog' && isOverLimit)}
			>
				{isSaving ? 'Posting...' : 'Post'}
			</Button>
		</div>
	</header>

	<div class="composer-container">
		{#if error}
			<div class="error-message">{error}</div>
		{/if}

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
				color: $grey-10;
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
		border-top: 1px solid $grey-80;
	}

	.char-count {
		font-size: 0.875rem;
		color: $grey-50;

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
				border-bottom: 1px solid $grey-90;
			}

			&:last-child {
				border-top: 1px solid $grey-90;
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
				background: $grey-97;
			}
		}

		:global(.description-input) {
			font-size: 1rem;
			line-height: 1.5;
			color: $grey-20;
			padding: $unit-3x;
			border: none;
			border-radius: 0;
			background: transparent;
			min-height: 100px;

			&:focus {
				border: none;
				background: $grey-97;
			}
		}
	}

	.title-input {
		width: 100%;
		padding: $unit-3x;
		border: none;
		background: transparent;
		font-size: 1rem;
		color: $grey-10;
		border-bottom: 1px solid $grey-90;

		&:focus {
			outline: none;
			background: $grey-97;
		}

		&::placeholder {
			color: $grey-60;
		}
	}
</style>
