<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import AdminHeader from '$lib/components/admin/AdminHeader.svelte'
	import AdminFilters from '$lib/components/admin/AdminFilters.svelte'
	import PostDropdown from '$lib/components/admin/PostDropdown.svelte'
	import LoadingSpinner from '$lib/components/admin/LoadingSpinner.svelte'
	import Select from '$lib/components/admin/Select.svelte'

	interface Post {
		id: number
		slug: string
		postType: string
		title: string | null
		content: any // JSON content
		excerpt: string | null
		status: string
		tags: string[] | null
		linkUrl: string | null
		linkDescription: string | null
		featuredImage: string | null
		publishedAt: string | null
		createdAt: string
		updatedAt: string
	}

	let posts = $state<Post[]>([])
	let filteredPosts = $state<Post[]>([])
	let isLoading = $state(true)
	let error = $state('')
	let total = $state(0)
	let postTypeCounts = $state<Record<string, number>>({})

	// Filter state
	let selectedFilter = $state<string>('all')

	// Create filter options
	const filterOptions = $derived([
		{ value: 'all', label: 'All posts' },
		{ value: 'post', label: 'Posts' },
		{ value: 'essay', label: 'Essays' }
	])

	const postTypeIcons: Record<string, string> = {
		post: '💭',
		essay: '📝',
		// Legacy types for backward compatibility
		blog: '📝',
		microblog: '💭',
		link: '🔗',
		photo: '📷',
		album: '🖼️'
	}

	const postTypeLabels: Record<string, string> = {
		post: 'Post',
		essay: 'Essay',
		// Legacy types for backward compatibility
		blog: 'Essay',
		microblog: 'Post',
		link: 'Post',
		photo: 'Post',
		album: 'Album'
	}

	onMount(async () => {
		await loadPosts()
	})

	async function loadPosts() {
		try {
			const auth = localStorage.getItem('admin_auth')
			if (!auth) {
				goto('/admin/login')
				return
			}

			const response = await fetch('/api/posts', {
				headers: { Authorization: `Basic ${auth}` }
			})

			if (!response.ok) {
				if (response.status === 401) {
					goto('/admin/login')
					return
				}
				throw new Error('Failed to load posts')
			}

			const data = await response.json()
			posts = data.posts || []
			total = data.pagination?.total || posts.length

			// Calculate post type counts and normalize types
			const counts: Record<string, number> = {
				all: posts.length,
				post: 0,
				essay: 0
			}

			posts.forEach((post) => {
				// Normalize legacy types to simplified types
				if (post.postType === 'blog') {
					counts.essay = (counts.essay || 0) + 1
				} else if (['microblog', 'link', 'photo'].includes(post.postType)) {
					counts.post = (counts.post || 0) + 1
				} else {
					counts[post.postType] = (counts[post.postType] || 0) + 1
				}
			})
			postTypeCounts = counts

			// Apply initial filter
			applyFilter()
		} catch (err) {
			error = 'Failed to load posts'
			console.error(err)
		} finally {
			isLoading = false
		}
	}

	function applyFilter() {
		if (selectedFilter === 'all') {
			filteredPosts = posts
		} else if (selectedFilter === 'post') {
			filteredPosts = posts.filter((post) =>
				['post', 'microblog', 'link', 'photo'].includes(post.postType)
			)
		} else if (selectedFilter === 'essay') {
			filteredPosts = posts.filter((post) => ['essay', 'blog'].includes(post.postType))
		} else {
			filteredPosts = posts.filter((post) => post.postType === selectedFilter)
		}
	}

	function handleFilterChange() {
		applyFilter()
	}

	function handlePostClick(post: Post) {
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
			return 'Today'
		} else if (diffDays === 1) {
			return 'Yesterday'
		} else if (diffDays < 7) {
			return `${diffDays} days ago`
		} else {
			return date.toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
			})
		}
	}

	function getDisplayTitle(post: Post): string {
		if (post.title) return post.title

		// For posts without titles, create a meaningful display title
		if (post.linkUrl) {
			try {
				const domain = new URL(post.linkUrl).hostname.replace('www.', '')
				return `Link to ${domain}`
			} catch {
				return 'Link post'
			}
		}

		const snippet = getPostSnippet(post)
		if (
			snippet &&
			snippet !== `${postTypeLabels[post.postType] || post.postType} without content`
		) {
			return snippet.length > 50 ? snippet.substring(0, 50) + '...' : snippet
		}

		return `${postTypeLabels[post.postType] || post.postType}`
	}
</script>

<AdminPage>
	<AdminHeader title="Universe" slot="header">
		{#snippet actions()}
			<PostDropdown />
		{/snippet}
	</AdminHeader>

	{#if error}
		<div class="error-message">{error}</div>
	{:else}
		<!-- Filters -->
		<AdminFilters>
			{#snippet left()}
				<Select
					bind:value={selectedFilter}
					options={filterOptions}
					size="small"
					variant="minimal"
					onchange={handleFilterChange}
				/>
			{/snippet}
		</AdminFilters>

		<!-- Posts List -->
		{#if isLoading}
			<div class="loading-container">
				<LoadingSpinner />
			</div>
		{:else if filteredPosts.length === 0}
			<div class="empty-state">
				<div class="empty-icon">📝</div>
				<h3>No posts found</h3>
				<p>
					{#if selectedFilter === 'all'}
						Create your first post to get started!
					{:else}
						No {selectedFilter}s found. Try a different filter or create a new {selectedFilter}.
					{/if}
				</p>
			</div>
		{:else}
			<div class="posts-list">
				{#each filteredPosts as post}
					<article class="post-item" onclick={() => handlePostClick(post)}>
						<div class="post-header">
							<div class="post-meta">
								<span class="post-type">
									{postTypeIcons[post.postType] || '📄'}
									{postTypeLabels[post.postType] || post.postType}
								</span>
								<span class="post-date">{formatDate(post.updatedAt)}</span>
							</div>
							<div class="post-status">
								{#if post.status === 'published'}
									<span class="status-badge published">Published</span>
								{:else}
									<span class="status-badge draft">Draft</span>
								{/if}
							</div>
						</div>

						<div class="post-content">
							<h3 class="post-title">{getDisplayTitle(post)}</h3>

							{#if post.linkUrl}
								<div class="post-link">
									<svg
										width="14"
										height="14"
										viewBox="0 0 24 24"
										fill="none"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path
											d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										/>
										<path
											d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										/>
									</svg>
									<span class="link-url">{post.linkUrl}</span>
								</div>
							{/if}

							<p class="post-snippet">{getPostSnippet(post)}</p>

							{#if post.tags && post.tags.length > 0}
								<div class="post-tags">
									{#each post.tags.slice(0, 3) as tag}
										<span class="tag">#{tag}</span>
									{/each}
									{#if post.tags.length > 3}
										<span class="tag-more">+{post.tags.length - 3} more</span>
									{/if}
								</div>
							{/if}
						</div>

						<div class="post-footer">
							<div class="post-actions">
								<span class="edit-hint">Click to edit</span>
							</div>
							<div class="post-indicator">
								<svg
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										d="M9 18l6-6-6-6"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
								</svg>
							</div>
						</div>
					</article>
				{/each}
			</div>
		{/if}
	{/if}
</AdminPage>

<style lang="scss">
	@import '$styles/variables.scss';


	.error-message {
		background: rgba(239, 68, 68, 0.1);
		color: #dc2626;
		padding: $unit-3x;
		border-radius: $unit-2x;
		border: 1px solid rgba(239, 68, 68, 0.2);
		text-align: center;
		margin-bottom: $unit-4x;
	}

	.loading-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 300px;
	}

	.empty-state {
		text-align: center;
		padding: $unit-8x $unit-4x;
		color: $grey-40;

		.empty-icon {
			font-size: 3rem;
			margin-bottom: $unit-3x;
		}

		h3 {
			font-size: 1.25rem;
			font-weight: 600;
			margin: 0 0 $unit-2x;
			color: $grey-20;
		}

		p {
			margin: 0;
			line-height: 1.5;
		}
	}

	.posts-list {
		display: flex;
		flex-direction: column;
		gap: $unit-3x;
	}

	.post-item {
		background: white;
		border: 1px solid $grey-85;
		border-radius: 12px;
		padding: $unit-4x;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		flex-direction: column;
		gap: $unit-3x;

		&:hover {
			border-color: $grey-70;
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
			transform: translateY(-2px);
		}

		&:active {
			transform: translateY(0);
		}
	}

	.post-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: $unit-2x;
	}

	.post-meta {
		display: flex;
		align-items: center;
		gap: $unit-2x;
		flex: 1;

		@media (max-width: 480px) {
			flex-direction: column;
			align-items: flex-start;
			gap: $unit;
		}
	}

	.post-type {
		display: inline-flex;
		align-items: center;
		gap: $unit-half;
		padding: $unit-half $unit;
		background: $grey-95;
		border-radius: 6px;
		font-size: 0.75rem;
		font-weight: 500;
		color: $grey-30;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.post-date {
		font-size: 0.875rem;
		color: $grey-50;
	}

	.post-status {
		flex-shrink: 0;
	}

	.status-badge {
		padding: $unit-half $unit-2x;
		border-radius: 50px;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.5px;

		&.published {
			background: rgba(34, 197, 94, 0.1);
			color: #16a34a;
			border: 1px solid rgba(34, 197, 94, 0.2);
		}

		&.draft {
			background: rgba(156, 163, 175, 0.1);
			color: #6b7280;
			border: 1px solid rgba(156, 163, 175, 0.2);
		}
	}

	.post-content {
		display: flex;
		flex-direction: column;
		gap: $unit-2x;
		flex: 1;
	}

	.post-title {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0;
		color: $grey-10;
		line-height: 1.4;
	}

	.post-link {
		display: flex;
		align-items: center;
		gap: $unit;
		font-size: 0.875rem;
		color: $blue-60;

		svg {
			flex-shrink: 0;
		}

		.link-url {
			word-break: break-all;
		}
	}

	.post-snippet {
		margin: 0;
		font-size: 0.925rem;
		line-height: 1.5;
		color: $grey-30;
	}

	.post-tags {
		display: flex;
		align-items: center;
		gap: $unit;
		flex-wrap: wrap;

		.tag {
			font-size: 0.75rem;
			color: $grey-50;
			background: $grey-95;
			padding: $unit-half $unit;
			border-radius: 4px;
		}

		.tag-more {
			font-size: 0.75rem;
			color: $grey-50;
			font-style: italic;
		}
	}

	.post-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: auto;
	}

	.post-actions {
		.edit-hint {
			font-size: 0.75rem;
			color: $grey-50;
			opacity: 0;
			transition: opacity 0.2s ease;
		}
	}

	.post-item:hover .edit-hint {
		opacity: 1;
	}

	.post-indicator {
		color: $grey-60;
		transition: color 0.2s ease;
	}

	.post-item:hover .post-indicator {
		color: $grey-30;
	}

	// Responsive adjustments
	@media (max-width: 768px) {
		.post-item {
			padding: $unit-3x;
		}
	}

	@media (max-width: 480px) {
		.post-item {
			padding: $unit-3x $unit-2x;
		}

		.post-header {
			flex-direction: column;
			align-items: stretch;
		}

		.post-status {
			align-self: flex-start;
		}
	}
</style>
