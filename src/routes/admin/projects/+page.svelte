<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import AdminHeader from '$lib/components/admin/AdminHeader.svelte'
	import AdminFilters from '$lib/components/admin/AdminFilters.svelte'
	import ProjectListItem from '$lib/components/admin/ProjectListItem.svelte'
	import DeleteConfirmationModal from '$lib/components/admin/DeleteConfirmationModal.svelte'
	import Button from '$lib/components/admin/Button.svelte'
	import Select from '$lib/components/admin/Select.svelte'
	import { createListFilters, commonSorts } from '$lib/admin/listFilters.svelte'
	import type { PageData } from './$types'
	import type { AdminProject } from '$lib/types/admin'

	const { data, form } = $props<{ data: PageData; form?: { message?: string } }>()

	let showDeleteModal = false
	let projectToDelete: AdminProject | null = null

	const actionError = form?.message ?? ''
	const projects = data.items ?? []

	// Create reactive filters
	const filters = createListFilters(projects, {
		filters: {
			type: { field: 'projectType', default: 'all' },
			status: { field: 'status', default: 'all' }
		},
		sorts: {
			newest: commonSorts.dateDesc<AdminProject>('createdAt'),
			oldest: commonSorts.dateAsc<AdminProject>('createdAt'),
			'title-asc': commonSorts.stringAsc<AdminProject>('title'),
			'title-desc': commonSorts.stringDesc<AdminProject>('title'),
			'year-desc': commonSorts.numberDesc<AdminProject>('year'),
			'year-asc': commonSorts.numberAsc<AdminProject>('year'),
			'status-published': commonSorts.statusPublishedFirst<AdminProject>('status'),
			'status-draft': commonSorts.statusDraftFirst<AdminProject>('status')
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
		{ value: 'all', label: 'All projects' },
		{ value: 'work', label: 'Work' },
		{ value: 'labs', label: 'Labs' }
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
		{ value: 'year-desc', label: 'Year (newest)' },
		{ value: 'year-asc', label: 'Year (oldest)' },
		{ value: 'status-published', label: 'Published first' },
		{ value: 'status-draft', label: 'Draft first' }
	]

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

	function handleEdit(event: CustomEvent<{ project: AdminProject }>) {
		goto(`/admin/projects/${event.detail.project.id}/edit`)
	}

	function handleTogglePublish(event: CustomEvent<{ project: AdminProject }>) {
		const project = event.detail.project
		if (!toggleForm || !toggleIdField || !toggleStatusField || !toggleUpdatedAtField) {
			return
		}

		toggleIdField.value = String(project.id)
		toggleStatusField.value = project.status === 'published' ? 'draft' : 'published'
		toggleUpdatedAtField.value = project.updatedAt
		toggleForm.requestSubmit()
	}

	function handleDelete(event: CustomEvent<{ project: AdminProject }>) {
		projectToDelete = event.detail.project
		showDeleteModal = true
	}

	function confirmDelete() {
		if (!projectToDelete || !deleteForm || !deleteIdField) return

		deleteIdField.value = String(projectToDelete.id)
		showDeleteModal = false
		deleteForm.requestSubmit()
		projectToDelete = null
	}

	function cancelDelete() {
		showDeleteModal = false
		projectToDelete = null
	}
</script>

<svelte:head>
	<title>Work - Admin @jedmund</title>
</svelte:head>

<AdminPage>
	<AdminHeader title="Work" slot="header">
		{#snippet actions()}
			<Button
				variant="primary"
				buttonSize="large"
				onclick={() => goto('/admin/projects/new')}
			>
				New project
			</Button>
		{/snippet}
	</AdminHeader>

	<AdminFilters>
		{#snippet left()}
				<Select
					value={filters.values.type}
					options={typeFilterOptions}
					size="small"
					variant="minimal"
					onchange={(e) => filters.set('type', (e.target as HTMLSelectElement).value)}
				/>
				<Select
					value={filters.values.status}
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
		<div class="error">{actionError}</div>
	{/if}

	{#if filters.items.length === 0}
		<div class="empty-state">
			<h3>No projects found</h3>
			<p>
				{#if filters.values.type === 'all' && filters.values.status === 'all'}
					Create your first project to get started!
				{:else}
					No projects found matching the current filters. Try adjusting your filters or create a new
					project.
				{/if}
			</p>
		</div>
	{:else}
		<div class="projects-list">
			{#each filters.items as project (project.id)}
				<ProjectListItem
					{project}
					on:edit={handleEdit}
					on:togglePublish={handleTogglePublish}
					on:delete={handleDelete}
				/>
			{/each}
		</div>
	{/if}
</AdminPage>

<DeleteConfirmationModal
	bind:isOpen={showDeleteModal}
	title="Delete Project?"
	message="Are you sure you want to delete this project? This action cannot be undone."
	confirmText="Delete Project"
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

	.error {
		background: rgba(239, 68, 68, 0.1);
		color: #dc2626;
		padding: $unit-3x;
		border-radius: $unit-2x;
		border: 1px solid rgba(239, 68, 68, 0.2);
		text-align: center;
		margin-bottom: $unit-4x;
	}

	.empty-state {
		text-align: center;
		padding: $unit-8x $unit-4x;
		color: $gray-40;

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

	.projects-list {
		display: flex;
		flex-direction: column;
		gap: $unit-2x;
	}

	.hidden-form {
		display: none;
	}
</style>
