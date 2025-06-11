<script lang="ts">
	import { goto } from '$app/navigation'
	import AdminByline from './AdminByline.svelte'

	interface Post {
		id: number
		slug: string
		postType: string
		title: string | null
		content: any // JSON content
		excerpt: string | null
		status: string
		tags: string[] | null
		featuredImage: string | null
		publishedAt: string | null
		createdAt: string
		updatedAt: string
	}

	interface Props {
		post: Post
	}

	let { post }: Props = $props()

	const postTypeLabels: Record<string, string> = {
		post: 'Post',
		essay: 'Essay',
		// Map database types to display names
		blog: 'Essay',
		microblog: 'Post'
	}

	function handlePostClick() {
		goto(`/admin/posts/${post.id}/edit`)
	}

	function getPostSnippet(post: Post): string {
		// Try excerpt first
		if (post.excerpt) {
			return post.excerpt.length > 150 ? post.excerpt.substring(0, 150) + '...' : post.excerpt
		}

		// Try to extract text from content JSON
		if (post.content) {
			let textContent = ''

			if (typeof post.content === 'object' && post.content.content) {
				// BlockNote/TipTap format
				function extractText(node: any): string {
					if (node.text) return node.text
					if (node.content && Array.isArray(node.content)) {
						return node.content.map(extractText).join(' ')
					}
					return ''
				}
				textContent = extractText(post.content)
			} else if (typeof post.content === 'string') {
				textContent = post.content
			}

			if (textContent) {
				return textContent.length > 150 ? textContent.substring(0, 150) + '...' : textContent
			}
		}

		// Fallback to link description for link posts
		if (post.linkDescription) {
			return post.linkDescription.length > 150
				? post.linkDescription.substring(0, 150) + '...'
				: post.linkDescription
		}

		// Default fallback
		return `${postTypeLabels[post.postType] || post.postType} without content`
	}

	function formatDate(dateString: string): string {
		const date = new Date(dateString)
		const now = new Date()
		const diffTime = now.getTime() - date.getTime()
		const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

		if (diffDays === 0) {
			return 'today'
		} else if (diffDays === 1) {
			return 'yesterday'
		} else if (diffDays < 7) {
			return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`
		} else {
			return date.toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
			})
		}
	}
</script>

<article class="post-item" onclick={handlePostClick}>
	{#if post.title}
		<h3 class="post-title">{post.title}</h3>
	{/if}

	<div class="post-content">
		<p class="post-preview">{getPostSnippet(post)}</p>
	</div>

	<AdminByline
		sections={[
			postTypeLabels[post.postType] || post.postType,
			post.status === 'published' ? 'Published' : 'Draft',
			post.status === 'published' && post.publishedAt
				? `published ${formatDate(post.publishedAt)}`
				: `created ${formatDate(post.createdAt)}`
		]}
	/>
</article>

<style lang="scss">
	.post-item {
		background: transparent;
		border: none;
		border-radius: $unit-2x;
		padding: $unit-2x;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		flex-direction: column;
		gap: $unit-2x;

		&:hover {
			background: $grey-95;
		}
	}

	.post-title {
		font-size: 1rem;
		font-weight: 600;
		margin: 0;
		color: $grey-10;
		line-height: 1.4;
	}

	.post-content {
		display: flex;
		flex-direction: column;
		gap: $unit;
	}

	.post-link-url {
		margin: 0;
		font-size: 0.875rem;
		color: $blue-60;
		word-break: break-all;
	}

	.post-preview {
		margin: 0;
		font-size: 0.925rem;
		line-height: 1.5;
		color: $grey-30;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	// Responsive adjustments
	@media (max-width: 768px) {
		.post-item {
			padding: $unit-2x;
		}
	}
</style>
