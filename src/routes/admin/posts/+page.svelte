<script lang="ts">
	import { goto, invalidate } from '$app/navigation'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import AdminHeader from '$lib/components/admin/AdminHeader.svelte'
	import AdminFilters from '$lib/components/admin/AdminFilters.svelte'
	import PostListItem from '$lib/components/admin/PostListItem.svelte'
	import InlineComposerModal from '$lib/components/admin/InlineComposerModal.svelte'
	import DeleteConfirmationModal from '$lib/components/admin/DeleteConfirmationModal.svelte'
	import EmptyState from '$lib/components/admin/EmptyState.svelte'
	import ErrorMessage from '$lib/components/admin/ErrorMessage.svelte'
	import Button from '$lib/components/admin/Button.svelte'
	import Select from '$lib/components/admin/Select.svelte'
	import { createListFilters, commonSorts } from '$lib/admin/listFilters.svelte'
	import type { PageData } from './$types'
	import type { AdminPost } from '$lib/types/admin'

const { data, form } = $props<{ data: PageData; form?: { message?: string } }>()

let showInlineComposer = $state(true)
let showDeleteConfirmation = $state(false)
let postToDelete: AdminPost | null = null

const actionError = form?.message ?? ''
const posts = data.items ?? []

// Create reactive filters
const filters = createListFilters(posts, {
	filters: {
		type: { field: 'postType', default: 'all' },
		status: { field: 'status', default: 'all' }
	},
	sorts: {
		newest: commonSorts.dateDesc<AdminPost>('createdAt'),
		oldest: commonSorts.dateAsc<AdminPost>('createdAt'),
		'title-asc': commonSorts.stringAsc<AdminPost>('title'),
		'title-desc': commonSorts.stringDesc<AdminPost>('title'),
		'status-published': commonSorts.statusPublishedFirst<AdminPost>('status'),
		'status-draft': commonSorts.statusDraftFirst<AdminPost>('status')
	},
	defaultSort: 'newest'
})

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
	{#snippet header()}
	<AdminHeader title="Universe">
		{#snippet actions()}
			<Button variant="primary" buttonSize="medium" onclick={handleNewEssay}>
				New essay
			</Button>
		{/snippet}
	</AdminHeader>
	{/snippet}

	{#if showInlineComposer}
		<div class="composer-section">
			<InlineComposerModal
				isOpen={true}
				initialMode="page"
				initialPostType="post"
				closeOnSave={false}
				onsaved={handleComposerSaved}
			/>
		</div>
	{/if}

	<AdminFilters>
		{#snippet left()}
			<Select
				value={String(filters.values.type)}
				options={typeFilterOptions}
				size="small"
				variant="minimal"
				onchange={(e) => filters.set('type', (e.target as HTMLSelectElement).value)}
			/>
			<Select
				value={String(filters.values.status)}
				options={statusFilterOptions}
				size="small"
				variant="minimal"
				onchange={(e) => filters.set('status', (e.target as HTMLSelectElement).value)}
			/>
		{/snippet}
		{#snippet right()}
			<Select
				value={filters.sort}
				options={sortOptions}
				size="small"
				variant="minimal"
				onchange={(e) => filters.setSort((e.target as HTMLSelectElement).value)}
			/>
		{/snippet}
	</AdminFilters>

	{#if actionError}
		<ErrorMessage message={actionError} />
	{/if}

	{#if filters.items.length === 0}
		<EmptyState
			title="No posts found"
			message={filters.values.type === 'all' && filters.values.status === 'all'
				? 'Create your first post to get started!'
				: 'No posts found matching the current filters. Try adjusting your filters or create a new post.'}
		>
			{#snippet icon()}
				📝
			{/snippet}
		</EmptyState>
	{:else}
		<div class="posts-list">
			{#each filters.items as post (post.id)}
				<PostListItem
					{post}
					onedit={handleEdit}
					ontogglepublish={handleTogglePublish}
					ondelete={handleDelete}
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

	.composer-section {
		margin-bottom: $unit-4x;
		padding: 0 $unit;
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
