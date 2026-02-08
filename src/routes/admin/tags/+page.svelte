<script lang="ts">
	import { onMount } from 'svelte'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
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

	let tags = $state<Tag[]>([])
	let isLoading = $state(true)
	let searchQuery = $state('')
	let sortBy = $state<'name' | 'usage' | 'recent'>('name')
	let sortOrder = $state<'asc' | 'desc'>('asc')
	let selectedTags = $state<number[]>([])
	let showMergeModal = $state(false)
	let mergeTargetId = $state<number | null>(null)
	let editingTag = $state<Tag | null>(null)
	let showCreateModal = $state(false)
	let newTagName = $state('')
	let newTagDescription = $state('')

	// Fetch tags
	async function fetchTags() {
		isLoading = true
		try {
			const params = new URLSearchParams({
				sort: sortBy,
				order: sortOrder,
				limit: '100'
			})

			if (searchQuery) {
				params.set('search', searchQuery)
			}

			const res = await fetch(`/api/tags?${params}`)
			const data = await res.json()
			tags = data.tags
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
		sortBy
		sortOrder
		fetchTags()
	})

	onMount(() => {
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
	async function handleDeleteTag(tagId: number) {
		if (!confirm('Are you sure you want to delete this tag? It will be removed from all posts.')) {
			return
		}

		try {
			const res = await fetch(`/api/tags/${tagId}`, {
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
		<header class="page-header">
			<div class="header-left">
				<h1>Tags</h1>
				<p class="subtitle">{tags.length} total tags</p>
			</div>
			<div class="header-actions">
				{#if selectedTags.length > 0}
					<button class="btn btn-secondary" onclick={() => (showMergeModal = true)}>
						Merge {selectedTags.length} Tags
					</button>
				{/if}
				<button class="btn btn-primary" onclick={() => (showCreateModal = true)}>
					Create Tag
				</button>
			</div>
		</header>
	{/snippet}

	<div class="tags-container">
		<!-- Filters -->
		<div class="filters">
			<input
				type="text"
				placeholder="Search tags..."
				bind:value={searchQuery}
				class="search-input"
			/>

			<div class="sort-controls">
				<select bind:value={sortBy} class="sort-select">
					<option value="name">Sort by Name</option>
					<option value="usage">Sort by Usage</option>
					<option value="recent">Sort by Recent</option>
				</select>

				<button
					class="btn-icon"
					onclick={() => (sortOrder = sortOrder === 'asc' ? 'desc' : 'asc')}
					aria-label="Toggle sort order"
				>
					{sortOrder === 'asc' ? '↑' : '↓'}
				</button>
			</div>
		</div>

		<!-- Tags List -->
		{#if isLoading}
			<div class="loading">Loading tags...</div>
		{:else if tags.length === 0}
			<div class="empty-state">
				<p>No tags found</p>
				{#if searchQuery}
					<button class="btn" onclick={() => (searchQuery = '')}>Clear search</button>
				{/if}
			</div>
		{:else}
			<div class="tags-grid">
				{#each tags as tag (tag.id)}
					<div class="tag-card" class:selected={selectedTags.includes(tag.id)}>
						<div class="tag-card-header">
							<input
								type="checkbox"
								checked={selectedTags.includes(tag.id)}
								onchange={() => toggleTagSelection(tag.id)}
								aria-label="Select {tag.displayName}"
							/>
							<div class="tag-info">
								<h3>{tag.displayName}</h3>
								<p class="tag-slug">{tag.slug}</p>
								{#if tag.description}
									<p class="tag-description">{tag.description}</p>
								{/if}
							</div>
						</div>

						<div class="tag-card-meta">
							<span class="usage-count">{tag.usageCount} posts</span>
							<div class="tag-actions">
								<button
									class="btn-icon-small"
									onclick={() => (editingTag = { ...tag })}
									aria-label="Edit tag"
								>
									✏️
								</button>
								<button
									class="btn-icon-small"
									onclick={() => handleDeleteTag(tag.id)}
									aria-label="Delete tag"
								>
									🗑️
								</button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</AdminPage>

<!-- Create Tag Modal -->
{#if showCreateModal}
	<div class="modal-overlay" onclick={() => (showCreateModal = false)}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<h2>Create New Tag</h2>
			<form
				onsubmit={(e) => {
					e.preventDefault()
					handleCreateTag()
				}}
			>
				<div class="form-group">
					<label for="tag-name">Tag Name</label>
					<input
						id="tag-name"
						type="text"
						bind:value={newTagName}
						placeholder="e.g., JavaScript"
						required
						autofocus
					/>
				</div>

				<div class="form-group">
					<label for="tag-description">Description (optional)</label>
					<textarea
						id="tag-description"
						bind:value={newTagDescription}
						placeholder="Brief description of this tag..."
						rows="3"
					></textarea>
				</div>

				<div class="modal-actions">
					<button type="button" class="btn btn-secondary" onclick={() => (showCreateModal = false)}>
						Cancel
					</button>
					<button type="submit" class="btn btn-primary">Create Tag</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Edit Tag Modal -->
{#if editingTag}
	<div class="modal-overlay" onclick={() => (editingTag = null)}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<h2>Edit Tag</h2>
			<form
				onsubmit={(e) => {
					e.preventDefault()
					handleUpdateTag()
				}}
			>
				<div class="form-group">
					<label for="edit-tag-name">Tag Name</label>
					<input
						id="edit-tag-name"
						type="text"
						bind:value={editingTag.displayName}
						required
						autofocus
					/>
				</div>

				<div class="form-group">
					<label for="edit-tag-description">Description</label>
					<textarea
						id="edit-tag-description"
						bind:value={editingTag.description}
						placeholder="Brief description of this tag..."
						rows="3"
					></textarea>
				</div>

				<div class="modal-actions">
					<button type="button" class="btn btn-secondary" onclick={() => (editingTag = null)}>
						Cancel
					</button>
					<button type="submit" class="btn btn-primary">Save Changes</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Merge Tags Modal -->
{#if showMergeModal}
	<div class="modal-overlay" onclick={() => (showMergeModal = false)}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
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
				<button type="button" class="btn btn-secondary" onclick={() => (showMergeModal = false)}>
					Cancel
				</button>
				<button type="button" class="btn btn-primary" onclick={handleMergeTags}>
					Merge Tags
				</button>
			</div>
		</div>
	</div>
{/if}

<style lang="scss">
	@import '$styles/variables';

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: $unit-4x;
	}

	.header-left {
		h1 {
			margin: 0;
			font-size: 2rem;
		}

		.subtitle {
			margin: $unit-half 0 0;
			color: $gray-40;
			font-size: 0.875rem;
		}
	}

	.header-actions {
		display: flex;
		gap: $unit-2x;
	}

	.tags-container {
		max-width: 1200px;
	}

	.filters {
		display: flex;
		gap: $unit-2x;
		margin-bottom: $unit-3x;

		.search-input {
			flex: 1;
			padding: $unit $unit-2x;
			border: 1px solid $gray-85;
			border-radius: $corner-radius-sm;
			font-size: 0.875rem;

			&:focus {
				outline: none;
				border-color: $blue-50;
				box-shadow: 0 0 0 3px rgba($blue-50, 0.1);
			}
		}

		.sort-controls {
			display: flex;
			gap: $unit;

			.sort-select {
				padding: $unit $unit-2x;
				border: 1px solid $gray-85;
				border-radius: $corner-radius-sm;
				font-size: 0.875rem;
				background: $white;
				cursor: pointer;

				&:focus {
					outline: none;
					border-color: $blue-50;
				}
			}
		}
	}

	.tags-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: $unit-2x;
	}

	.tag-card {
		padding: $unit-2x;
		border: 2px solid $gray-85;
		border-radius: $corner-radius-md;
		background: $white;
		transition: all 0.2s ease;

		&.selected {
			border-color: $blue-50;
			background: rgba($blue-50, 0.05);
		}

		&:hover {
			border-color: $gray-70;
		}
	}

	.tag-card-header {
		display: flex;
		gap: $unit-2x;
		margin-bottom: $unit-2x;

		input[type='checkbox'] {
			flex-shrink: 0;
			margin-top: 2px;
		}

		.tag-info {
			flex: 1;

			h3 {
				margin: 0;
				font-size: 1.125rem;
			}

			.tag-slug {
				margin: $unit-half 0;
				color: $gray-60;
				font-size: 0.75rem;
				font-family: monospace;
			}

			.tag-description {
				margin: $unit 0 0;
				color: $gray-40;
				font-size: 0.875rem;
				line-height: 1.4;
			}
		}
	}

	.tag-card-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: $unit-2x;
		border-top: 1px solid $gray-90;

		.usage-count {
			color: $gray-40;
			font-size: 0.875rem;
		}

		.tag-actions {
			display: flex;
			gap: $unit;
		}
	}

	.btn {
		padding: $unit $unit-2x;
		border: none;
		border-radius: $corner-radius-sm;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;

		&.btn-primary {
			background: $blue-50;
			color: $white;

			&:hover {
				background: darken($blue-50, 5%);
			}
		}

		&.btn-secondary {
			background: $gray-90;
			color: $gray-20;

			&:hover {
				background: $gray-85;
			}
		}
	}

	.btn-icon {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid $gray-85;
		border-radius: $corner-radius-sm;
		background: $white;
		cursor: pointer;
		font-size: 1.25rem;

		&:hover {
			background: $gray-95;
		}
	}

	.btn-icon-small {
		border: none;
		background: none;
		cursor: pointer;
		font-size: 1rem;
		padding: $unit-half;
		opacity: 0.7;
		transition: opacity 0.2s ease;

		&:hover {
			opacity: 1;
		}
	}

	.loading,
	.empty-state {
		text-align: center;
		padding: $unit-6x;
		color: $gray-40;
	}

	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal {
		background: $white;
		border-radius: $corner-radius-md;
		padding: $unit-4x;
		max-width: 500px;
		width: 90%;
		max-height: 90vh;
		overflow-y: auto;

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

		label {
			display: block;
			margin-bottom: $unit;
			font-weight: 500;
			font-size: 0.875rem;
		}

		input,
		textarea {
			width: 100%;
			padding: $unit $unit-2x;
			border: 1px solid $gray-85;
			border-radius: $corner-radius-sm;
			font-size: 0.875rem;
			font-family: inherit;

			&:focus {
				outline: none;
				border-color: $blue-50;
				box-shadow: 0 0 0 3px rgba($blue-50, 0.1);
			}
		}

		textarea {
			resize: vertical;
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
