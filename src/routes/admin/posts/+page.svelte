<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import AdminHeader from '$lib/components/admin/AdminHeader.svelte'
	import AdminFilters from '$lib/components/admin/AdminFilters.svelte'
	import PostListItem from '$lib/components/admin/PostListItem.svelte'
	import LoadingSpinner from '$lib/components/admin/LoadingSpinner.svelte'
	import Select from '$lib/components/admin/Select.svelte'
	import UniverseComposer from '$lib/components/admin/UniverseComposer.svelte'

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

	let posts = $state<Post[]>([])
	let filteredPosts = $state<Post[]>([])
	let isLoading = $state(true)
	let error = $state('')
	let total = $state(0)
	let postTypeCounts = $state<Record<string, number>>({})
	let statusCounts = $state<Record<string, number>>({})

	// Filter state
	let selectedTypeFilter = $state<string>('all')
	let selectedStatusFilter = $state<string>('all')

	// Composer state
	let showInlineComposer = $state(true)
	let isInteractingWithFilters = $state(false)

	// Create filter options
	const typeFilterOptions = $derived([
		{ value: 'all', label: 'All posts' },
		{ value: 'post', label: 'Posts' },
		{ value: 'essay', label: 'Essays' }
	])

	const statusFilterOptions = $derived([
		{ value: 'all', label: 'All statuses' },
		{ value: 'published', label: 'Published' },
		{ value: 'draft', label: 'Draft' }
	])

	const postTypeIcons: Record<string, string> = {
		post: '💭',
		essay: '📝'
	}

	const postTypeLabels: Record<string, string> = {
		post: 'Post',
		essay: 'Essay'
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

			// Calculate post type counts
			const typeCounts: Record<string, number> = {
				all: posts.length,
				post: 0,
				essay: 0
			}

			posts.forEach((post) => {
				if (post.postType === 'post') {
					typeCounts.post++
				} else if (post.postType === 'essay') {
					typeCounts.essay++
				}
			})
			postTypeCounts = typeCounts

			// Calculate status counts
			const statusCountsTemp: Record<string, number> = {
				all: posts.length,
				published: posts.filter((p) => p.status === 'published').length,
				draft: posts.filter((p) => p.status === 'draft').length
			}
			statusCounts = statusCountsTemp

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
		let filtered = posts

		// Apply type filter
		if (selectedTypeFilter !== 'all') {
			filtered = filtered.filter((post) => post.postType === selectedTypeFilter)
		}

		// Apply status filter
		if (selectedStatusFilter !== 'all') {
			filtered = filtered.filter((post) => post.status === selectedStatusFilter)
		}

		filteredPosts = filtered
	}

	function handleTypeFilterChange() {
		applyFilter()
	}

	function handleStatusFilterChange() {
		applyFilter()
	}

	function handleComposerSaved() {
		// Reload posts when a new post is created
		loadPosts()
	}
</script>

<AdminPage>
	<AdminHeader title="Universe" slot="header" />

	{#if error}
		<div class="error-message">{error}</div>
	{:else}
		<!-- Inline Composer -->
		{#if showInlineComposer}
			<div class="composer-section">
				<UniverseComposer
					isOpen={true}
					initialMode="page"
					initialPostType="post"
					closeOnSave={false}
					on:saved={handleComposerSaved}
				/>
			</div>
		{/if}

		<!-- Filters -->
		<AdminFilters>
			{#snippet left()}
				<Select
					bind:value={selectedTypeFilter}
					options={typeFilterOptions}
					size="small"
					variant="minimal"
					onchange={handleTypeFilterChange}
				/>
				<Select
					bind:value={selectedStatusFilter}
					options={statusFilterOptions}
					size="small"
					variant="minimal"
					onchange={handleStatusFilterChange}
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
					{#if selectedTypeFilter === 'all' && selectedStatusFilter === 'all'}
						Create your first post to get started!
					{:else}
						No posts found matching the current filters. Try adjusting your filters or create a new
						post.
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

	.composer-section {
		margin-bottom: $unit-4x;
		padding: 0 $unit;
	}
</style>
