<script lang="ts">
	import TagMergeModal from '$lib/components/admin/TagMergeModal.svelte'
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

	import { createTagsController } from '$lib/admin/tags-controller.svelte'
	const { data } = $props<{ data: PageData }>()
	const controller = createTagsController(data.tags)
</script>

<svelte:head>
	<title>Tags - Admin @jedmund</title>
</svelte:head>

<AdminPage>
	{#snippet header()}
		<AdminHeader title="Tags">
			{#snippet actions()}
				{#if controller.selectedTags.length >= 2}
					<Button variant="secondary" onclick={() => (controller.showMergeModal = true)}>
						Merge {controller.selectedTags.length} tags
					</Button>
				{/if}
				<Button variant="primary" onclick={() => (controller.showCreateModal = true)}
					>New tag</Button
				>
			{/snippet}
		</AdminHeader>
	{/snippet}

	<AdminFilters>
		{#snippet left()}
			<Input
				type="search"
				placeholder="Search tags..."
				bind:value={controller.searchQuery}
				size="small"
			/>
		{/snippet}
		{#snippet right()}
			<Select
				bind:value={controller.sort}
				options={controller.sortOptions}
				size="small"
				variant="minimal"
			/>
		{/snippet}
	</AdminFilters>

	{#if controller.isLoading}
		<div class="loading">Loading tags...</div>
	{:else if controller.tags.length === 0}
		<EmptyState
			title="No tags found"
			message={controller.searchQuery
				? 'Try adjusting your search query.'
				: 'Create your first tag to get started.'}
		>
			{#snippet action()}
				{#if controller.searchQuery}
					<Button variant="secondary" onclick={() => (controller.searchQuery = '')}
						>Clear search</Button
					>
				{:else}
					<Button variant="primary" onclick={() => (controller.showCreateModal = true)}
						>New tag</Button
					>
				{/if}
			{/snippet}
		</EmptyState>
	{:else}
		<div class="tags-list">
			{#each controller.tags as tag (tag.id)}
				<TagListItem
					{tag}
					selected={controller.selectedTags.includes(tag.id)}
					ontoggleselect={controller.toggleTagSelection}
					onedit={(t) => (controller.editingTag = { ...t })}
					ondelete={controller.handleDeleteTag}
				/>
			{/each}
		</div>
	{/if}
</AdminPage>

<!-- New tag Modal -->
<BaseModal bind:isOpen={controller.showCreateModal} size="medium">
	<div class="modal-content">
		<h2>New tag</h2>
		<form
			onsubmit={(e) => {
				e.preventDefault()
				controller.handleCreateTag()
			}}
		>
			<div class="form-group">
				<Input
					id="tag-name"
					type="text"
					label="Tag Name"
					bind:value={controller.newTagName}
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
					bind:value={controller.newTagDescription}
					placeholder="Brief description of this tag..."
					rows="3"
					class="textarea"
				></textarea>
			</div>

			<div class="modal-actions">
				<Button variant="secondary" onclick={() => (controller.showCreateModal = false)}
					>Cancel</Button
				>
				<Button variant="primary" type="submit">New tag</Button>
			</div>
		</form>
	</div>
</BaseModal>

<!-- Edit Tag Modal -->
<BaseModal
	isOpen={!!controller.editingTag}
	onClose={() => (controller.editingTag = null)}
	size="medium"
>
	{#if controller.editingTag}
		<div class="modal-content">
			<h2>Edit Tag</h2>
			<form
				onsubmit={(e) => {
					e.preventDefault()
					controller.handleUpdateTag()
				}}
			>
				<div class="form-group">
					<Input
						id="edit-tag-name"
						type="text"
						label="Tag Name"
						bind:value={controller.editingTag.displayName}
						required={true}
						size="medium"
						fullWidth={true}
					/>
				</div>

				<div class="form-group">
					<label for="edit-tag-description" class="input-label">Description</label>
					<textarea
						id="edit-tag-description"
						bind:value={controller.editingTag.description}
						placeholder="Brief description of this tag..."
						rows="3"
						class="textarea"
					></textarea>
				</div>

				<div class="modal-actions">
					<Button variant="secondary" onclick={() => (controller.editingTag = null)}>Cancel</Button>
					<Button variant="primary" type="submit">Save Changes</Button>
				</div>
			</form>
		</div>
	{/if}
</BaseModal>

<TagMergeModal
	bind:isOpen={controller.showMergeModal}
	bind:targetId={controller.mergeTargetId}
	tags={controller.tags.filter((tag) => controller.selectedTags.includes(tag.id))}
	onmerge={controller.handleMergeTags}
/>

<DeleteConfirmationModal
	bind:isOpen={controller.showDeleteConfirmation}
	title="Delete Tag?"
	message="Are you sure you want to delete this tag? It will be removed from all posts."
	confirmText="Delete Tag"
	onConfirm={controller.confirmDelete}
	onCancel={() => (controller.deletingTagId = null)}
/>

<style lang="scss">
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
</style>
