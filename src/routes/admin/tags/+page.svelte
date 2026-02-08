<script lang="ts">
	import type { PageData } from './$types'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import AdminHeader from '$lib/components/admin/AdminHeader.svelte'
	import AdminFilters from '$lib/components/admin/AdminFilters.svelte'
	import Button from '$lib/components/admin/Button.svelte'
	import BaseModal from '$lib/components/admin/BaseModal.svelte'
	import Input from '$lib/components/admin/Input.svelte'
	import Select from '$lib/components/admin/Select.svelte'
	import EmptyState from '$lib/components/admin/EmptyState.svelte'
	import DeleteConfirmationModal from '$lib/components/admin/DeleteConfirmationModal.svelte'
	import TagListItem from '$lib/components/admin/TagListItem.svelte'
	import { debounce } from '$lib/utils/debounce'

	interface Tag {
		id: number
		name: string
		displayName: string
		slug: string
		description: string | null
		usageCount: number
		createdAt: string
		updatedAt: string
	}

	const { data } = $props<{ data: PageData }>()

	let tags = $state<Tag[]>(data.tags)
	let isLoading = $state(false)
	let searchQuery = $state('')
	let sort = $state('name-asc')

	const sortOptions = [
		{ value: 'name-asc', label: 'Name (A-Z)' },
		{ value: 'name-desc', label: 'Name (Z-A)' },
		{ value: 'usage-desc', label: 'Most used' },
		{ value: 'usage-asc', label: 'Least used' },
		{ value: 'recent-desc', label: 'Newest' },
		{ value: 'recent-asc', label: 'Oldest' }
	]
	let selectedTags = $state<number[]>([])
	let showMergeModal = $state(false)
	let mergeTargetId = $state<number | null>(null)
	let editingTag = $state<Tag | null>(null)
	let showCreateModal = $state(false)
	let showDeleteConfirmation = $state(false)
	let deletingTagId = $state<number | null>(null)
	let newTagName = $state('')
	let newTagDescription = $state('')

	// Fetch tags
	async function fetchTags() {
		isLoading = true
		try {
			const [sortBy, sortOrder] = sort.split('-') as [string, string]
			const params = new URLSearchParams({
				sort: sortBy,
				order: sortOrder,
				limit: '100'
			})

			if (searchQuery) {
				params.set('search', searchQuery)
			}

			const res = await fetch(`/api/tags?${params}`)
			const fetchedData = await res.json()
			tags = fetchedData.tags
		} catch (error) {
			console.error('Failed to fetch tags:', error)
		} finally {
			isLoading = false
		}
	}

	// Debounced search
	const debouncedFetch = debounce(fetchTags, 300)

	// Watch for search changes
	$effect(() => {
		searchQuery
		debouncedFetch()
	})

	// Watch for sort changes
	$effect(() => {
		sort
		fetchTags()
	})

	// Create new tag
	async function handleCreateTag() {
		if (!newTagName.trim()) return

		try {
			const res = await fetch('/api/tags', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: newTagName,
					description: newTagDescription || undefined
				}),
				credentials: 'same-origin'
			})

			if (!res.ok) {
				const error = await res.json()
				alert(error.error.message)
				return
			}

			showCreateModal = false
			newTagName = ''
			newTagDescription = ''
			await fetchTags()
		} catch (error) {
			console.error('Failed to create tag:', error)
			alert('Failed to create tag')
		}
	}

	// Update tag
	async function handleUpdateTag() {
		if (!editingTag) return

		try {
			const res = await fetch(`/api/tags/${editingTag.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: editingTag.displayName,
					description: editingTag.description || undefined
				}),
				credentials: 'same-origin'
			})

			if (!res.ok) {
				const error = await res.json()
				alert(error.error.message)
				return
			}

			editingTag = null
			await fetchTags()
		} catch (error) {
			console.error('Failed to update tag:', error)
			alert('Failed to update tag')
		}
	}

	// Delete tag
	function handleDeleteTag(tagId: number) {
		deletingTagId = tagId
		showDeleteConfirmation = true
	}

	async function confirmDelete() {
		if (!deletingTagId) return

		try {
			const res = await fetch(`/api/tags/${deletingTagId}`, {
				method: 'DELETE',
				credentials: 'same-origin'
			})

			if (!res.ok) {
				alert('Failed to delete tag')
				return
			}

			await fetchTags()
		} catch (error) {
			console.error('Failed to delete tag:', error)
			alert('Failed to delete tag')
		} finally {
			deletingTagId = null
		}
	}

	// Merge tags
	async function handleMergeTags() {
		if (selectedTags.length === 0 || !mergeTargetId) {
			alert('Please select tags to merge and a target tag')
			return
		}

		const sourceIds = selectedTags.filter((id) => id !== mergeTargetId)

		if (sourceIds.length === 0) {
			alert('Please select at least one source tag different from the target')
			return
		}

		if (!confirm(`Merge ${sourceIds.length} tag(s) into the selected target?`)) {
			return
		}

		try {
			const res = await fetch('/api/tags/merge', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					sourceTagIds: sourceIds,
					targetTagId: mergeTargetId
				}),
				credentials: 'same-origin'
			})

			if (!res.ok) {
				const error = await res.json()
				alert(error.error.message)
				return
			}

			showMergeModal = false
			selectedTags = []
			mergeTargetId = null
			await fetchTags()
		} catch (error) {
			console.error('Failed to merge tags:', error)
			alert('Failed to merge tags')
		}
	}

	// Toggle tag selection
	function toggleTagSelection(tagId: number) {
		if (selectedTags.includes(tagId)) {
			selectedTags = selectedTags.filter((id) => id !== tagId)
		} else {
			selectedTags = [...selectedTags, tagId]
		}
	}
</script>

<svelte:head>
	<title>Tags - Admin @jedmund</title>
</svelte:head>

<AdminPage>
	{#snippet header()}
		<AdminHeader title="Tags">
			{#snippet actions()}
				{#if selectedTags.length >= 2}
					<Button variant="secondary" onclick={() => (showMergeModal = true)}>
						Merge {selectedTags.length} tags
					</Button>
				{/if}
				<Button variant="primary" onclick={() => (showCreateModal = true)}>New tag</Button>
			{/snippet}
		</AdminHeader>
	{/snippet}

	<AdminFilters>
		{#snippet left()}
			<Input
				type="search"
				placeholder="Search tags..."
				bind:value={searchQuery}
				size="small"
			/>
		{/snippet}
		{#snippet right()}
			<Select
				bind:value={sort}
				options={sortOptions}
				size="small"
				variant="minimal"
			/>
		{/snippet}
	</AdminFilters>

	{#if isLoading}
		<div class="loading">Loading tags...</div>
	{:else if tags.length === 0}
		<EmptyState
			title="No tags found"
			message={searchQuery ? 'Try adjusting your search query.' : 'Create your first tag to get started.'}
		>
			{#snippet action()}
				{#if searchQuery}
					<Button variant="secondary" onclick={() => (searchQuery = '')}>Clear search</Button>
				{:else}
					<Button variant="primary" onclick={() => (showCreateModal = true)}>New tag</Button>
				{/if}
			{/snippet}
		</EmptyState>
	{:else}
		<div class="tags-list">
			{#each tags as tag (tag.id)}
				<TagListItem
					{tag}
					selected={selectedTags.includes(tag.id)}
					ontoggleselect={toggleTagSelection}
					onedit={(t) => (editingTag = { ...t })}
					ondelete={handleDeleteTag}
				/>
			{/each}
		</div>
	{/if}
</AdminPage>

<!-- New tag Modal -->
<BaseModal bind:isOpen={showCreateModal} size="medium">
	<div class="modal-content">
		<h2>New tag</h2>
		<form
			onsubmit={(e) => {
				e.preventDefault()
				handleCreateTag()
			}}
		>
			<div class="form-group">
				<Input
					id="tag-name"
					type="text"
					label="Tag Name"
					bind:value={newTagName}
					placeholder="e.g., JavaScript"
					required={true}
					size="medium"
					fullWidth={true}
				/>
			</div>

			<div class="form-group">
				<label for="tag-description" class="input-label">Description (optional)</label>
				<textarea
					id="tag-description"
					bind:value={newTagDescription}
					placeholder="Brief description of this tag..."
					rows="3"
					class="textarea"
				></textarea>
			</div>

			<div class="modal-actions">
				<Button variant="secondary" onclick={() => (showCreateModal = false)}>Cancel</Button>
				<Button variant="primary" type="submit">New tag</Button>
			</div>
		</form>
	</div>
</BaseModal>

<!-- Edit Tag Modal -->
<BaseModal isOpen={!!editingTag} onClose={() => (editingTag = null)} size="medium">
	{#if editingTag}
		<div class="modal-content">
			<h2>Edit Tag</h2>
			<form
				onsubmit={(e) => {
					e.preventDefault()
					handleUpdateTag()
				}}
			>
				<div class="form-group">
					<Input
						id="edit-tag-name"
						type="text"
						label="Tag Name"
						bind:value={editingTag.displayName}
						required={true}
						size="medium"
						fullWidth={true}
					/>
				</div>

				<div class="form-group">
					<label for="edit-tag-description" class="input-label">Description</label>
					<textarea
						id="edit-tag-description"
						bind:value={editingTag.description}
						placeholder="Brief description of this tag..."
						rows="3"
						class="textarea"
					></textarea>
				</div>

				<div class="modal-actions">
					<Button variant="secondary" onclick={() => (editingTag = null)}>Cancel</Button>
					<Button variant="primary" type="submit">Save Changes</Button>
				</div>
			</form>
		</div>
	{/if}
</BaseModal>

<!-- Merge Tags Modal -->
<BaseModal bind:isOpen={showMergeModal} size="medium">
	<div class="modal-content">
		<h2>Merge Tags</h2>
		<p class="modal-description">
			Select which tag to keep. All other selected tags will be merged into it and deleted.
		</p>

		<div class="merge-list">
			{#each tags.filter((t) => selectedTags.includes(t.id)) as tag (tag.id)}
				<label class="merge-option">
					<input type="radio" name="merge-target" value={tag.id} bind:group={mergeTargetId} />
					<span class="merge-tag-name">{tag.displayName}</span>
					<span class="merge-tag-count">({tag.usageCount} posts)</span>
				</label>
			{/each}
		</div>

		<div class="modal-actions">
			<Button variant="secondary" onclick={() => (showMergeModal = false)}>Cancel</Button>
			<Button variant="primary" onclick={handleMergeTags}>Merge Tags</Button>
		</div>
	</div>
</BaseModal>

<DeleteConfirmationModal
	bind:isOpen={showDeleteConfirmation}
	title="Delete Tag?"
	message="Are you sure you want to delete this tag? It will be removed from all posts."
	confirmText="Delete Tag"
	onConfirm={confirmDelete}
	onCancel={() => (deletingTagId = null)}
/>

<style lang="scss">
	@import '$styles/variables';

	.tags-list {
		display: flex;
		flex-direction: column;
	}

	.loading {
		text-align: center;
		padding: $unit-6x;
		color: $gray-40;
	}

	.modal-content {
		padding: $unit-4x;

		h2 {
			margin: 0 0 $unit-2x;
			font-size: 1.5rem;
		}

		.modal-description {
			margin: 0 0 $unit-3x;
			color: $gray-40;
			font-size: 0.875rem;
		}
	}

	.form-group {
		margin-bottom: $unit-3x;

		.input-label {
			display: block;
			margin-bottom: $unit;
			font-weight: 500;
			font-size: 14px;
			color: $gray-20;
		}

		.textarea {
			width: 100%;
			padding: $unit $unit-2x;
			border: 1px solid $gray-85;
			border-radius: $corner-radius-sm;
			font-size: 0.875rem;
			font-family: inherit;
			resize: vertical;
			box-sizing: border-box;

			&:focus {
				outline: none;
				border-color: $blue-50;
				box-shadow: 0 0 0 3px rgba($blue-50, 0.1);
			}
		}
	}

	.modal-actions {
		display: flex;
		gap: $unit-2x;
		justify-content: flex-end;
		margin-top: $unit-4x;
	}

	.merge-list {
		display: flex;
		flex-direction: column;
		gap: $unit;
		margin-bottom: $unit-3x;

		.merge-option {
			display: flex;
			align-items: center;
			gap: $unit;
			padding: $unit $unit-2x;
			border: 1px solid $gray-85;
			border-radius: $corner-radius-sm;
			cursor: pointer;
			transition: all 0.2s ease;

			&:hover {
				background: $gray-95;
			}

			input {
				flex-shrink: 0;
			}

			.merge-tag-name {
				flex: 1;
				font-weight: 500;
			}

			.merge-tag-count {
				color: $gray-60;
				font-size: 0.875rem;
			}
		}
	}
</style>
