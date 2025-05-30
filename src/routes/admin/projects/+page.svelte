<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import ProjectListItem from '$lib/components/admin/ProjectListItem.svelte'
	import DeleteConfirmationModal from '$lib/components/admin/DeleteConfirmationModal.svelte'

	interface Project {
		id: number
		title: string
		subtitle: string | null
		year: number
		client: string | null
		status: string
		backgroundColor: string | null
		highlightColor: string | null
		createdAt: string
		updatedAt: string
	}

	let projects = $state<Project[]>([])
	let isLoading = $state(true)
	let error = $state('')
	let showDeleteModal = $state(false)
	let projectToDelete = $state<Project | null>(null)
	let activeDropdown = $state<number | null>(null)

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
</script>

<AdminPage>
	<header slot="header">
		<h1>Projects</h1>
		<div class="header-actions">
			<a href="/admin/projects/new" class="btn btn-primary">New Project</a>
		</div>
	</header>

	{#if error}
		<div class="error">{error}</div>
	{:else if isLoading}
		<div class="loading">
			<div class="spinner"></div>
			<p>Loading projects...</p>
		</div>
	{:else if projects.length === 0}
		<div class="empty-state">
			<p>No projects found. Create your first project!</p>
		</div>
	{:else}
		<div class="projects-list">
			{#each projects as project}
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
</AdminPage>

{#if showDeleteModal && projectToDelete}
	<DeleteConfirmationModal
		title="Delete project?"
		message={`Are you sure you want to delete "${projectToDelete.title}"? This action cannot be undone.`}
		onconfirm={confirmDelete}
		oncancel={cancelDelete}
	/>
{/if}

<style lang="scss">
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;

		h1 {
			font-size: 1.75rem;
			font-weight: 700;
			margin: 0;
			color: $grey-10;
			font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		}
	}

	.header-actions {
		display: flex;
		gap: $unit-2x;
	}

	.btn {
		padding: $unit-2x $unit-3x;
		border-radius: 50px;
		text-decoration: none;
		font-size: 0.925rem;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		transition: all 0.2s ease;
		border: none;
		cursor: pointer;

		&.btn-primary {
			background-color: $grey-10;
			color: white;

			&:hover {
				background-color: $grey-20;
			}
		}
	}

	.error {
		text-align: center;
		padding: $unit-6x;
		color: #d33;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
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
			font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
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
			font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		}
	}

	.projects-list {
		display: flex;
		flex-direction: column;
	}
</style>
