<script lang="ts">
	import { onMount } from 'svelte'
	import { goto, invalidate } from '$app/navigation'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import AdminHeader from '$lib/components/admin/AdminHeader.svelte'
	import AdminFilters from '$lib/components/admin/AdminFilters.svelte'
	import PostListItem from '$lib/components/admin/PostListItem.svelte'
	import InlineComposerModal from '$lib/components/admin/InlineComposerModal.svelte'
	import DeleteConfirmationModal from '$lib/components/admin/DeleteConfirmationModal.svelte'
	import Button from '$lib/components/admin/Button.svelte'
	import Select from '$lib/components/admin/Select.svelte'
	import type { PageData } from './$types'
	import type { AdminPost } from '$lib/types/admin'

const { data, form } = $props<{ data: PageData; form?: { message?: string } }>()

let showInlineComposer = true
let showDeleteConfirmation = false
let postToDelete: AdminPost | null = null

let selectedTypeFilter = 'all'
let selectedStatusFilter = 'all'
let sortBy = 'newest'

const actionError = form?.message ?? ''
const posts = data.items ?? []
let filteredPosts = $state<AdminPost[]>([...posts])

	let toggleForm: HTMLFormElement | null = null
	let toggleIdField: HTMLInputElement | null = null
	let toggleStatusField: HTMLInputElement | null = null
	let toggleUpdatedAtField: HTMLInputElement | null = null

	let deleteForm: HTMLFormElement | null = null
	let deleteIdField: HTMLInputElement | null = null

const typeFilterOptions = [
	{ value: 'all', label: 'All posts' },
	{ value: 'post', label: 'Posts' },
	{ value: 'essay', label: 'Essays' }
]

const statusFilterOptions = [
		{ value: 'all', label: 'All statuses' },
		{ value: 'published', label: 'Published' },
		{ value: 'draft', label: 'Draft' }
]

	const sortOptions = [
		{ value: 'newest', label: 'Newest first' },
		{ value: 'oldest', label: 'Oldest first' },
		{ value: 'title-asc', label: 'Title (A-Z)' },
		{ value: 'title-desc', label: 'Title (Z-A)' },
		{ value: 'status-published', label: 'Published first' },
		{ value: 'status-draft', label: 'Draft first' }
	]

function applyFilterAndSort() {
	let next = [...posts]

	if (selectedTypeFilter !== 'all') {
		next = next.filter((post) => post.postType === selectedTypeFilter)
	}

	if (selectedStatusFilter !== 'all') {
		next = next.filter((post) => post.status === selectedStatusFilter)
	}

	switch (sortBy) {
		case 'oldest':
			next.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
			break
		case 'title-asc':
			next.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
			break
		case 'title-desc':
			next.sort((a, b) => (b.title || '').localeCompare(a.title || ''))
			break
		case 'status-published':
			next.sort((a, b) => {
				if (a.status === b.status) return 0
				return a.status === 'published' ? -1 : 1
			})
			break
		case 'status-draft':
			next.sort((a, b) => {
				if (a.status === b.status) return 0
				return a.status === 'draft' ? -1 : 1
			})
			break
		case 'newest':
		default:
			next.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
			break
	}

	filteredPosts = next
}

applyFilterAndSort()

function handleTypeFilterChange() {
	applyFilterAndSort()
}

function handleStatusFilterChange() {
	applyFilterAndSort()
}

function handleSortChange() {
	applyFilterAndSort()
}

	onMount(() => {
		document.addEventListener('click', handleOutsideClick)
		return () => document.removeEventListener('click', handleOutsideClick)
	})

	function handleOutsideClick(event: MouseEvent) {
		const target = event.target as HTMLElement
		if (!target.closest('.dropdown-container')) {
			document.dispatchEvent(new CustomEvent('closeDropdowns'))
		}
	}

	function handleNewEssay() {
		goto('/admin/posts/new?type=essay')
	}

	async function handleComposerSaved() {
		await invalidate('admin:posts')
	}

	function handleEdit(event: CustomEvent<{ post: AdminPost }>) {
		goto(`/admin/posts/${event.detail.post.id}/edit`)
	}

	function handleTogglePublish(event: CustomEvent<{ post: AdminPost }>) {
		const post = event.detail.post
		if (!toggleForm || !toggleIdField || !toggleStatusField || !toggleUpdatedAtField) {
			return
		}

		toggleIdField.value = String(post.id)
		toggleStatusField.value = post.status === 'published' ? 'draft' : 'published'
		toggleUpdatedAtField.value = post.updatedAt
		toggleForm.requestSubmit()
	}

	function handleDelete(event: CustomEvent<{ post: AdminPost }>) {
		postToDelete = event.detail.post
		showDeleteConfirmation = true
	}

	function confirmDelete() {
		if (!postToDelete || !deleteForm || !deleteIdField) return

		deleteIdField.value = String(postToDelete.id)
		showDeleteConfirmation = false
		deleteForm.requestSubmit()
		postToDelete = null
	}

	function cancelDelete() {
		showDeleteConfirmation = false
		postToDelete = null
	}
</script>

<svelte:head>
	<title>Universe - Admin @jedmund</title>
</svelte:head>

<AdminPage>
	<AdminHeader title="Universe" slot="header">
		{#snippet actions()}
			<Button variant="primary" buttonSize="large" onclick={handleNewEssay}>
				New Essay
			</Button>
		{/snippet}
	</AdminHeader>

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

	{#if actionError}
		<div class="error-message">{actionError}</div>
	{/if}

	{#if filteredPosts.length === 0}
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
			{#each filteredPosts as post (post.id)}
				<PostListItem
					{post}
					on:edit={handleEdit}
					on:togglePublish={handleTogglePublish}
					on:delete={handleDelete}
				/>
			{/each}
		</div>
	{/if}
</AdminPage>

<DeleteConfirmationModal
	bind:isOpen={showDeleteConfirmation}
	title="Delete Post?"
	message="Are you sure you want to delete this post? This action cannot be undone."
	confirmText="Delete Post"
	onConfirm={confirmDelete}
	onCancel={cancelDelete}
/>

<form method="POST" action="?/toggle-status" class="hidden-form" bind:this={toggleForm}>
	<input type="hidden" name="id" bind:this={toggleIdField} />
	<input type="hidden" name="status" bind:this={toggleStatusField} />
	<input type="hidden" name="updatedAt" bind:this={toggleUpdatedAtField} />
</form>

<form method="POST" action="?/delete" class="hidden-form" bind:this={deleteForm}>
	<input type="hidden" name="id" bind:this={deleteIdField} />
</form>

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

	.composer-section {
		margin-bottom: $unit-4x;
		padding: 0 $unit;
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

	.hidden-form {
		display: none;
	}
</style>
