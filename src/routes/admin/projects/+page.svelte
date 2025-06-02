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

	interface Project {
		id: number
		title: string
		subtitle: string | null
		year: number
		client: string | null
		status: string
		projectType: string
		backgroundColor: string | null
		highlightColor: string | null
		createdAt: string
		updatedAt: string
	}

	let projects = $state<Project[]>([])
	let filteredProjects = $state<Project[]>([])
	let isLoading = $state(true)
	let error = $state('')
	let showDeleteModal = $state(false)
	let projectToDelete = $state<Project | null>(null)
	let activeDropdown = $state<number | null>(null)
	let statusCounts = $state<Record<string, number>>({})

	// Filter state
	let selectedStatusFilter = $state<string>('all')
	let selectedTypeFilter = $state<string>('all')

	// Create filter options
	const statusFilterOptions = $derived([
		{ value: 'all', label: 'All projects' },
		{ value: 'published', label: 'Published' },
		{ value: 'draft', label: 'Draft' }
	])

	const typeFilterOptions = [
		{ value: 'all', label: 'All types' },
		{ value: 'work', label: 'Work' },
		{ value: 'labs', label: 'Labs' }
	]

	onMount(async () => {
		await loadProjects()
		// Close dropdown when clicking outside
		document.addEventListener('click', handleOutsideClick)
		return () => document.removeEventListener('click', handleOutsideClick)
	})

	function handleOutsideClick(event: MouseEvent) {
		const target = event.target as HTMLElement
		if (!target.closest('.dropdown-container')) {
			activeDropdown = null
		}
	}

	async function loadProjects() {
		try {
			const auth = localStorage.getItem('admin_auth')
			if (!auth) {
				goto('/admin/login')
				return
			}

			const response = await fetch('/api/projects', {
				headers: { Authorization: `Basic ${auth}` }
			})

			if (!response.ok) {
				if (response.status === 401) {
					goto('/admin/login')
					return
				}
				throw new Error('Failed to load projects')
			}

			const data = await response.json()
			projects = data.projects

			// Calculate status counts
			const counts: Record<string, number> = {
				all: projects.length,
				published: projects.filter((p) => p.status === 'published').length,
				draft: projects.filter((p) => p.status === 'draft').length
			}
			statusCounts = counts

			// Apply initial filter
			applyFilter()
		} catch (err) {
			error = 'Failed to load projects'
			console.error(err)
		} finally {
			isLoading = false
		}
	}

	function handleToggleDropdown(event: CustomEvent<{ projectId: number; event: MouseEvent }>) {
		event.detail.event.stopPropagation()
		activeDropdown = activeDropdown === event.detail.projectId ? null : event.detail.projectId
	}

	function handleEdit(event: CustomEvent<{ project: Project; event: MouseEvent }>) {
		event.detail.event.stopPropagation()
		goto(`/admin/projects/${event.detail.project.id}/edit`)
	}

	async function handleTogglePublish(event: CustomEvent<{ project: Project; event: MouseEvent }>) {
		event.detail.event.stopPropagation()
		activeDropdown = null

		const project = event.detail.project

		try {
			const auth = localStorage.getItem('admin_auth')
			const newStatus = project.status === 'published' ? 'draft' : 'published'

			const response = await fetch(`/api/projects/${project.id}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Basic ${auth}`
				},
				body: JSON.stringify({ status: newStatus })
			})

			if (response.ok) {
				await loadProjects()
			}
		} catch (err) {
			console.error('Failed to update project status:', err)
		}
	}

	function handleDelete(event: CustomEvent<{ project: Project; event: MouseEvent }>) {
		event.detail.event.stopPropagation()
		activeDropdown = null
		projectToDelete = event.detail.project
		showDeleteModal = true
	}

	async function confirmDelete() {
		if (!projectToDelete) return

		try {
			const auth = localStorage.getItem('admin_auth')

			const response = await fetch(`/api/projects/${projectToDelete.id}`, {
				method: 'DELETE',
				headers: { Authorization: `Basic ${auth}` }
			})

			if (response.ok) {
				await loadProjects()
			}
		} catch (err) {
			console.error('Failed to delete project:', err)
		} finally {
			showDeleteModal = false
			projectToDelete = null
		}
	}

	function cancelDelete() {
		showDeleteModal = false
		projectToDelete = null
	}

	function applyFilter() {
		let filtered = projects

		// Apply status filter
		if (selectedStatusFilter !== 'all') {
			filtered = filtered.filter((project) => project.status === selectedStatusFilter)
		}

		// Apply type filter based on projectType field
		if (selectedTypeFilter !== 'all') {
			filtered = filtered.filter((project) => project.projectType === selectedTypeFilter)
		}

		filteredProjects = filtered
	}

	function handleStatusFilterChange() {
		applyFilter()
	}

	function handleTypeFilterChange() {
		applyFilter()
	}
</script>

<AdminPage>
	<AdminHeader title="Projects" slot="header">
		{#snippet actions()}
			<Button variant="primary" size="large" href="/admin/projects/new">New Project</Button>
		{/snippet}
	</AdminHeader>

	{#if error}
		<div class="error">{error}</div>
	{:else}
		<!-- Filters -->
		<AdminFilters>
			{#snippet left()}
				<Select
					bind:value={selectedStatusFilter}
					options={statusFilterOptions}
					size="small"
					variant="minimal"
					onchange={handleStatusFilterChange}
				/>
				<Select
					bind:value={selectedTypeFilter}
					options={typeFilterOptions}
					size="small"
					variant="minimal"
					onchange={handleTypeFilterChange}
				/>
			{/snippet}
		</AdminFilters>

		<!-- Projects List -->
		{#if isLoading}
			<div class="loading">
				<div class="spinner"></div>
				<p>Loading projects...</p>
			</div>
		{:else if filteredProjects.length === 0}
			<div class="empty-state">
				<p>
					{#if selectedStatusFilter === 'all' && selectedTypeFilter === 'all'}
						No projects found. Create your first project!
					{:else}
						No projects found matching the current filters. Try adjusting your filters or create a new project.
					{/if}
				</p>
			</div>
		{:else}
			<div class="projects-list">
				{#each filteredProjects as project}
					<ProjectListItem
						{project}
						isDropdownActive={activeDropdown === project.id}
						ontoggleDropdown={handleToggleDropdown}
						onedit={handleEdit}
						ontogglePublish={handleTogglePublish}
						ondelete={handleDelete}
					/>
				{/each}
			</div>
		{/if}
	{/if}
</AdminPage>

<DeleteConfirmationModal
	bind:isOpen={showDeleteModal}
	title="Delete project?"
	message={projectToDelete
		? `Are you sure you want to delete "${projectToDelete.title}"? This action cannot be undone.`
		: ''}
	onConfirm={confirmDelete}
	onCancel={cancelDelete}
/>

<style lang="scss">


	.error {
		text-align: center;
		padding: $unit-6x;
		color: #d33;
	}

	.loading {
		padding: $unit-8x;
		text-align: center;
		color: $grey-40;

		.spinner {
			width: 32px;
			height: 32px;
			border: 3px solid $grey-80;
			border-top-color: $primary-color;
			border-radius: 50%;
			margin: 0 auto $unit-2x;
			animation: spin 0.8s linear infinite;
		}

		p {
			margin: 0;
		}
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.empty-state {
		padding: $unit-8x;
		text-align: center;
		color: $grey-40;

		p {
			margin: 0;
		}
	}

	.projects-list {
		display: flex;
		flex-direction: column;
	}
</style>
