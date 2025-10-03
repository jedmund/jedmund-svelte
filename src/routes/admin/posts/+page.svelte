<script lang="ts">
	import { onMount } from 'svelte'
import { goto } from '$app/navigation'
import { api } from '$lib/admin/api'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import AdminHeader from '$lib/components/admin/AdminHeader.svelte'
	import AdminFilters from '$lib/components/admin/AdminFilters.svelte'
	import PostListItem from '$lib/components/admin/PostListItem.svelte'
	import LoadingSpinner from '$lib/components/admin/LoadingSpinner.svelte'
	import Select from '$lib/components/admin/Select.svelte'
	import InlineComposerModal from '$lib/components/admin/InlineComposerModal.svelte'
	import DeleteConfirmationModal from '$lib/components/admin/DeleteConfirmationModal.svelte'
	import Button from '$lib/components/admin/Button.svelte'

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
	let sortBy = $state<string>('newest')

	// Composer state
	let showInlineComposer = $state(true)
	let isInteractingWithFilters = $state(false)

	// Delete confirmation state
	let showDeleteConfirmation = $state(false)
	let postToDelete = $state<Post | null>(null)

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

	const sortOptions = [
		{ value: 'newest', label: 'Newest first' },
		{ value: 'oldest', label: 'Oldest first' },
		{ value: 'title-asc', label: 'Title (A-Z)' },
		{ value: 'title-desc', label: 'Title (Z-A)' },
		{ value: 'status-published', label: 'Published first' },
		{ value: 'status-draft', label: 'Draft first' }
	]

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
			const data = await api.get('/api/posts')
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

			// Apply initial filter and sort
			applyFilterAndSort()
		} catch (err) {
			error = 'Failed to load posts'
			console.error(err)
		} finally {
			isLoading = false
		}
	}

	function applyFilterAndSort() {
		let filtered = [...posts]

		// Apply type filter
		if (selectedTypeFilter !== 'all') {
			filtered = filtered.filter((post) => post.postType === selectedTypeFilter)
		}

		// Apply status filter
		if (selectedStatusFilter !== 'all') {
			filtered = filtered.filter((post) => post.status === selectedStatusFilter)
		}

		// Apply sorting
		switch (sortBy) {
			case 'oldest':
				filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
				break
			case 'title-asc':
				filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
				break
			case 'title-desc':
				filtered.sort((a, b) => (b.title || '').localeCompare(a.title || ''))
				break
			case 'status-published':
				filtered.sort((a, b) => {
					if (a.status === b.status) return 0
					return a.status === 'published' ? -1 : 1
				})
				break
			case 'status-draft':
				filtered.sort((a, b) => {
					if (a.status === b.status) return 0
					return a.status === 'draft' ? -1 : 1
				})
				break
			case 'newest':
			default:
				filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
				break
		}

		filteredPosts = filtered
	}

	function handleTypeFilterChange() {
		applyFilterAndSort()
	}

	function handleStatusFilterChange() {
		applyFilterAndSort()
	}

	function handleSortChange() {
		applyFilterAndSort()
	}

	function handleComposerSaved() {
		// Reload posts when a new post is created
		loadPosts()
	}

	function handleNewEssay() {
		goto('/admin/posts/new?type=essay')
	}

	async function handleTogglePublish(event: CustomEvent<{ post: Post }>) {
		const { post } = event.detail
		const newStatus = post.status === 'published' ? 'draft' : 'published'

		try {
			await api.patch(`/api/posts/${post.id}`, { status: newStatus, updatedAt: post.updatedAt })
			await loadPosts()
		} catch (error) {
			console.error('Failed to toggle publish status:', error)
		}
	}

	function handleDeletePost(event: CustomEvent<{ post: Post }>) {
		postToDelete = event.detail.post
		showDeleteConfirmation = true
	}

	async function confirmDelete() {
		if (!postToDelete) return

		try {
			await api.delete(`/api/posts/${postToDelete.id}`)
			showDeleteConfirmation = false
			postToDelete = null
			await loadPosts()
		} catch (error) {
			console.error('Failed to delete post:', error)
		}
	}
</script>

<svelte:head>
	<title>Universe - Admin @jedmund</title>
</svelte:head>

<AdminPage>
	<AdminHeader title="Universe" slot="header">
		{#snippet actions()}
			<Button variant="primary" buttonSize="large" onclick={handleNewEssay}>New Essay</Button>
		{/snippet}
	</AdminHeader>

	{#if error}
		<div class="error-message">{error}</div>
	{:else}
		<!-- Inline Composer -->
		{#if showInlineComposer}
			<div class="composer-section">
				<InlineComposerModal
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
			{#snippet right()}
				<Select
					bind:value={sortBy}
					options={sortOptions}
					size="small"
					variant="minimal"
					onchange={handleSortChange}
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
					<PostListItem
						{post}
						on:togglePublish={handleTogglePublish}
						on:delete={handleDeletePost}
					/>
				{/each}
			</div>
		{/if}
	{/if}
</AdminPage>

<DeleteConfirmationModal
	bind:isOpen={showDeleteConfirmation}
	title="Delete Post?"
	message="Are you sure you want to delete this post? This action cannot be undone."
	confirmText="Delete Post"
	onConfirm={confirmDelete}
	onCancel={() => {
		showDeleteConfirmation = false
		postToDelete = null
	}}
/>

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
		color: $gray-40;

		.empty-icon {
			font-size: 3rem;
			margin-bottom: $unit-3x;
		}

		h3 {
			font-size: 1.25rem;
			font-weight: 600;
			margin: 0 0 $unit-2x;
			color: $gray-20;
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
