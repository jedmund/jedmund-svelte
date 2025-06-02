<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import AdminHeader from '$lib/components/admin/AdminHeader.svelte'
	import AdminFilters from '$lib/components/admin/AdminFilters.svelte'
	import PostListItem from '$lib/components/admin/PostListItem.svelte'
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
					<PostListItem {post} />
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
		gap: $unit-2x;
	}


</style>
