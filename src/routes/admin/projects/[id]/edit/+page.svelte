<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import { page } from '$app/stores'
	import ProjectForm from '$lib/components/admin/ProjectForm.svelte'
	import type { Project } from '$lib/types/project'

	let project = $state<Project | null>(null)
	let isLoading = $state(true)
	let error = $state('')

	const projectId = $derived($page.params.id)

	onMount(async () => {
		await loadProject()
	})

	async function loadProject() {
		try {
			const auth = localStorage.getItem('admin_auth')
			if (!auth) {
				goto('/admin/login')
				return
			}

			const response = await fetch(`/api/projects/${projectId}`, {
				headers: { Authorization: `Basic ${auth}` }
			})

			if (!response.ok) {
				throw new Error('Failed to load project')
			}

			const data = await response.json()
			project = data
		} catch (err) {
			error = 'Failed to load project'
			console.error(err)
		} finally {
			isLoading = false
		}
	}
</script>

<svelte:head>
	<title>{project ? `Edit ${project.title}` : 'Edit Project'} - Admin @jedmund</title>
</svelte:head>

{#if isLoading}
	<div class="loading">Loading project...</div>
{:else if error}
	<div class="error">{error}</div>
{:else if !project}
	<div class="error">Project not found</div>
{:else}
	<ProjectForm {project} mode="edit" />
{/if}

<style lang="scss">
	.loading,
	.error {
		text-align: center;
		padding: $unit-6x;
		color: $grey-40;
	}

	.error {
		color: #d33;
	}
</style>
