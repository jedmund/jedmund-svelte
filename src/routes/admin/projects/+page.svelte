<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import Page from '$lib/components/Page.svelte'
	import DataTable from '$lib/components/admin/DataTable.svelte'
	import ProjectTitleCell from '$lib/components/admin/ProjectTitleCell.svelte'

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
	}

	let projects = $state<Project[]>([])
	let isLoading = $state(true)
	let error = $state('')
	let total = $state(0)

	const columns = [
		{
			key: 'title',
			label: 'Title',
			width: '40%',
			component: ProjectTitleCell
		},
		{
			key: 'year',
			label: 'Year',
			width: '15%'
		},
		{
			key: 'client',
			label: 'Client',
			width: '30%',
			render: (project: Project) => project.client || '—'
		},
		{
			key: 'status',
			label: 'Status',
			width: '15%',
			render: (project: Project) => {
				return project.status === 'published' ? '🟢' : '⚪'
			}
		}
	]

	onMount(async () => {
		await loadProjects()
	})

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
			total = data.pagination?.total || projects.length
		} catch (err) {
			error = 'Failed to load projects'
			console.error(err)
		} finally {
			isLoading = false
		}
	}

	function handleRowClick(project: Project) {
		goto(`/admin/projects/${project.id}/edit`)
	}
</script>

<Page>
	<header slot="header">
		<h1>Projects</h1>
		<div class="header-actions">
			<a href="/admin/projects/new" class="btn btn-primary">New Project</a>
		</div>
	</header>

	{#if error}
		<div class="error">{error}</div>
	{:else}
		<div class="projects-stats">
			<div class="stat">
				<span class="stat-value">{total}</span>
				<span class="stat-label">Total projects</span>
			</div>
		</div>

		<DataTable
			data={projects}
			{columns}
			loading={isLoading}
			emptyMessage="No projects found. Create your first project!"
			onRowClick={handleRowClick}
		/>
	{/if}
</Page>

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

	.projects-stats {
		display: flex;
		gap: $unit-4x;
		margin-bottom: $unit-4x;

		.stat {
			display: flex;
			flex-direction: column;
			gap: $unit-half;

			.stat-value {
				font-size: 1.5rem;
				font-weight: 700;
				color: $grey-10;
				font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
			}

			.stat-label {
				font-size: 0.875rem;
				color: $grey-40;
				font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
			}
		}
	}
</style>
