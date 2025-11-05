<script lang="ts">
	import { goto } from '$app/navigation'
	import { onMount } from 'svelte'
	import AdminByline from './AdminByline.svelte'
	import type { AdminPost } from '$lib/types/admin'

	interface Props {
		post: AdminPost
		onedit?: (event: CustomEvent<{ post: AdminPost }>) => void
		ontogglepublish?: (event: CustomEvent<{ post: AdminPost }>) => void
		ondelete?: (event: CustomEvent<{ post: AdminPost }>) => void
	}

	let { post, onedit, ontogglepublish, ondelete }: Props = $props()

	let isDropdownOpen = $state(false)

	const postTypeLabels: Record<string, string> = {
		post: 'Post',
		essay: 'Essay'
	}

	function handlePostClick(event: MouseEvent) {
		// Don't navigate if clicking on the dropdown button
		if ((event.target as HTMLElement).closest('.dropdown-container')) {
			return
		}
		goto(`/admin/posts/${post.id}/edit`)
	}

	function handleToggleDropdown(event: MouseEvent) {
		event.stopPropagation()
		isDropdownOpen = !isDropdownOpen
	}

	function handleEdit(event: MouseEvent) {
		event.stopPropagation()
		onedit?.(new CustomEvent('edit', { detail: { post } }))
		goto(`/admin/posts/${post.id}/edit`)
	}

	function handleTogglePublish(event: MouseEvent) {
		event.stopPropagation()
		ontogglepublish?.(new CustomEvent('togglepublish', { detail: { post } }))
		isDropdownOpen = false
	}

	function handleDelete(event: MouseEvent) {
		event.stopPropagation()
		ondelete?.(new CustomEvent('delete', { detail: { post } }))
		isDropdownOpen = false
	}

	onMount(() => {
		function handleCloseDropdowns() {
			isDropdownOpen = false
		}

		document.addEventListener('closeDropdowns', handleCloseDropdowns)
		return () => document.removeEventListener('closeDropdowns', handleCloseDropdowns)
	})

	function getPostSnippet(post: AdminPost): string {
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
	<div class="post-main">
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
	</div>

	<div class="dropdown-container">
		<button
			class="action-button"
			type="button"
			onclick={handleToggleDropdown}
			aria-label="Post actions"
		>
			<svg
				width="20"
				height="20"
				viewBox="0 0 20 20"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<circle cx="10" cy="4" r="1.5" fill="currentColor" />
				<circle cx="10" cy="10" r="1.5" fill="currentColor" />
				<circle cx="10" cy="16" r="1.5" fill="currentColor" />
			</svg>
		</button>

		{#if isDropdownOpen}
			<div class="dropdown-menu">
				<button class="dropdown-item" type="button" onclick={handleEdit}>
					Edit post
				</button>
				<button class="dropdown-item" type="button" onclick={handleTogglePublish}>
					{post.status === 'published' ? 'Unpublish' : 'Publish'} post
				</button>
				<div class="dropdown-divider"></div>
				<button class="dropdown-item danger" type="button" onclick={handleDelete}>
					Delete post
				</button>
			</div>
		{/if}
	</div>
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
		flex-direction: row;
		align-items: flex-start;
		gap: $unit-2x;

		&:hover {
			background: $gray-95;
		}
	}

	.post-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: $unit-2x;
		min-width: 0;
	}

	.post-title {
		font-size: 1rem;
		font-weight: 600;
		margin: 0;
		color: $gray-10;
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
		color: $gray-30;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.dropdown-container {
		position: relative;
		flex-shrink: 0;
	}

	.action-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: $unit;
		cursor: pointer;
		color: $gray-30;
		transition: all 0.2s ease;

		&:hover {
			background-color: rgba(0, 0, 0, 0.05);
		}
	}

	.dropdown-menu {
		position: absolute;
		top: 100%;
		right: 0;
		margin-top: $unit-half;
		background: white;
		border: 1px solid $gray-85;
		border-radius: $unit;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		overflow: hidden;
		min-width: 180px;
		z-index: 10;
	}

	.dropdown-item {
		width: 100%;
		padding: $unit-2x $unit-3x;
		background: none;
		border: none;
		text-align: left;
		font-size: 0.875rem;
		color: $gray-20;
		cursor: pointer;
		transition: background-color 0.2s ease;

		&:hover {
			background-color: $gray-95;
		}

		&.danger {
			color: $red-60;
		}
	}

	.dropdown-divider {
		height: 1px;
		background-color: $gray-80;
		margin: $unit-half 0;
	}

	// Responsive adjustments
	@media (max-width: 768px) {
		.post-item {
			padding: $unit-2x;
		}
	}
</style>
