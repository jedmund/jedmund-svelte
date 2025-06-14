<script lang="ts">
	import { goto } from '$app/navigation'
	import { createEventDispatcher, onMount } from 'svelte'
	import AdminByline from './AdminByline.svelte'

	interface Project {
		id: number
		title: string
		subtitle: string | null
		year: number
		client: string | null
		status: string
		projectType: string
		logoUrl: string | null
		backgroundColor: string | null
		highlightColor: string | null
		publishedAt: string | null
		createdAt: string
		updatedAt: string
	}

	interface Props {
		project: Project
	}

	let { project }: Props = $props()

	const dispatch = createEventDispatcher<{
		edit: { project: Project }
		togglePublish: { project: Project }
		delete: { project: Project }
	}>()

	let isDropdownOpen = $state(false)

	function formatRelativeTime(dateString: string): string {
		const date = new Date(dateString)
		const now = new Date()
		const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

		if (diffInSeconds < 60) return 'just now'

		const minutes = Math.floor(diffInSeconds / 60)
		if (diffInSeconds < 3600) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`

		const hours = Math.floor(diffInSeconds / 3600)
		if (diffInSeconds < 86400) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`

		const days = Math.floor(diffInSeconds / 86400)
		if (diffInSeconds < 2592000) return `${days} ${days === 1 ? 'day' : 'days'} ago`

		const months = Math.floor(diffInSeconds / 2592000)
		if (diffInSeconds < 31536000) return `${months} ${months === 1 ? 'month' : 'months'} ago`

		const years = Math.floor(diffInSeconds / 31536000)
		return `${years} ${years === 1 ? 'year' : 'years'} ago`
	}

	function handleProjectClick() {
		goto(`/admin/projects/${project.id}/edit`)
	}

	function handleToggleDropdown(event: MouseEvent) {
		event.stopPropagation()
		isDropdownOpen = !isDropdownOpen
	}

	function handleEdit() {
		dispatch('edit', { project })
	}

	function handleTogglePublish() {
		dispatch('togglePublish', { project })
	}

	function handleDelete() {
		dispatch('delete', { project })
	}

	onMount(() => {
		function handleCloseDropdowns() {
			isDropdownOpen = false
		}

		document.addEventListener('closeDropdowns', handleCloseDropdowns)
		return () => document.removeEventListener('closeDropdowns', handleCloseDropdowns)
	})
</script>

<div
	class="project-item"
	role="button"
	tabindex="0"
	onclick={handleProjectClick}
	onkeydown={(e) => e.key === 'Enter' && handleProjectClick()}
>
	<div class="project-logo" style="background-color: {project.backgroundColor || '#F5F5F5'}">
		{#if project.logoUrl}
			<img src={project.logoUrl} alt="{project.title} logo" class="logo-image" />
		{/if}
	</div>

	<div class="project-info">
		<h3 class="project-title">{project.title}</h3>
		<AdminByline
			sections={[
				project.projectType === 'work' ? 'Work' : 'Labs',
				project.status === 'published' ? 'Published' : 'Draft',
				project.status === 'published' && project.publishedAt
					? `Published ${formatRelativeTime(project.publishedAt)}`
					: `Created ${formatRelativeTime(project.createdAt)}`
			]}
		/>
	</div>

	<div class="dropdown-container">
		<button class="action-button" onclick={handleToggleDropdown} aria-label="Project actions">
			<svg
				width="20"
				height="20"
				viewBox="0 0 20 20"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<circle cx="10" cy="4" r="1.5" fill="currentColor" />
				<circle cx="10" cy="10" r="1.5" fill="currentColor" />
				<circle cx="10" cy="16" r="1.5" fill="currentColor" />
			</svg>
		</button>

		{#if isDropdownOpen}
			<div class="dropdown-menu">
				<button class="dropdown-item" onclick={handleEdit}>Edit project</button>
				<button class="dropdown-item" onclick={handleTogglePublish}>
					{project.status === 'published' ? 'Unpublish' : 'Publish'} project
				</button>
				<div class="dropdown-divider"></div>
				<button class="dropdown-item danger" onclick={handleDelete}>Delete project</button>
			</div>
		{/if}
	</div>
</div>

<style lang="scss">
	.project-item {
		display: flex;
		box-sizing: border-box;
		align-items: center;
		gap: $unit-2x;
		padding: $unit-2x;
		background: white;
		border-radius: $unit-2x;
		cursor: pointer;
		transition: all 0.2s ease;
		width: 100%;
		text-align: left;

		&:hover {
			background-color: $grey-95;
		}
	}

	.project-logo {
		flex-shrink: 0;
		width: 60px;
		height: 60px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: $unit;
		padding: $unit-2x;
		box-sizing: border-box;

		.logo-image {
			max-width: 100%;
			max-height: 100%;
			object-fit: contain;
		}
	}

	.project-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: $unit-half;
		min-width: 0;
	}

	.project-title {
		font-size: 1rem;
		font-weight: 600;
		color: $grey-10;
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.dropdown-container {
		position: relative;
		flex-shrink: 0;
	}

	.action-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: $unit;
		cursor: pointer;
		color: $grey-30;
		transition: all 0.2s ease;

		&:hover {
			background-color: rgba(0, 0, 0, 0.05);
		}
	}

	.dropdown-menu {
		position: absolute;
		top: 100%;
		right: 0;
		margin-top: $unit-half;
		background: white;
		border: 1px solid $grey-85;
		border-radius: $unit;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		overflow: hidden;
		min-width: 180px;
		z-index: 10;
	}

	.dropdown-item {
		width: 100%;
		padding: $unit-2x $unit-3x;
		background: none;
		border: none;
		text-align: left;
		font-size: 0.875rem;
		color: $grey-20;
		cursor: pointer;
		transition: background-color 0.2s ease;

		&:hover {
			background-color: $grey-95;
		}

		&.danger {
			color: $red-60;
		}
	}

	.dropdown-divider {
		height: 1px;
		background-color: $grey-80;
		margin: $unit-half 0;
	}
</style>
