<script lang="ts">
	import { onMount } from 'svelte'
	import AdminByline from './AdminByline.svelte'
	import Checkbox from './Checkbox.svelte'

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

	interface Props {
		tag: Tag
		selected?: boolean
		ontoggleselect?: (tagId: number) => void
		onedit?: (tag: Tag) => void
		ondelete?: (tagId: number) => void
	}

	let { tag, selected = false, ontoggleselect, onedit, ondelete }: Props = $props()

	let isDropdownOpen = $state(false)

	function handleToggleDropdown(event: MouseEvent) {
		event.stopPropagation()
		isDropdownOpen = !isDropdownOpen
	}

	function handleEdit(event: MouseEvent) {
		event.stopPropagation()
		onedit?.(tag)
		isDropdownOpen = false
	}

	function handleDelete(event: MouseEvent) {
		event.stopPropagation()
		ondelete?.(tag.id)
		isDropdownOpen = false
	}

	function formatDate(dateString: string): string {
		const date = new Date(dateString)
		const now = new Date()
		const diffTime = now.getTime() - date.getTime()
		const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

		if (diffDays === 0) {
			return 'today'
		} else if (diffDays === 1) {
			return 'yesterday'
		} else if (diffDays < 7) {
			return `${diffDays} days ago`
		} else {
			return date.toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
			})
		}
	}

	onMount(() => {
		function handleCloseDropdowns() {
			isDropdownOpen = false
		}

		document.addEventListener('closeDropdowns', handleCloseDropdowns)
		return () => document.removeEventListener('closeDropdowns', handleCloseDropdowns)
	})
</script>

<div class="tag-item" class:selected>
	<Checkbox
		checked={selected}
		size="large"
		onchange={() => ontoggleselect?.(tag.id)}
		aria-label="Select {tag.displayName}"
	/>

	<div class="tag-main">
		<h3 class="tag-title">{tag.displayName}</h3>
		<AdminByline
			sections={[
				tag.slug,
				`${tag.usageCount} ${tag.usageCount === 1 ? 'post' : 'posts'}`,
				`created ${formatDate(tag.createdAt)}`
			]}
		/>
	</div>

	<div class="dropdown-container">
		<button
			class="action-button"
			type="button"
			onclick={handleToggleDropdown}
			aria-label="Tag actions"
		>
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
				<button class="dropdown-item" type="button" onclick={handleEdit}>
					Edit tag
				</button>
				<div class="dropdown-divider"></div>
				<button class="dropdown-item danger" type="button" onclick={handleDelete}>
					Delete tag
				</button>
			</div>
		{/if}
	</div>
</div>

<style lang="scss">
	.tag-item {
		background: transparent;
		border: none;
		border-radius: $unit-2x;
		padding: $unit-2x;
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: $unit-2x;
		transition: all 0.2s ease;

		&:hover {
			background: $gray-95;
		}

		&.selected {
			background: rgba($blue-50, 0.05);
		}
	}

	.tag-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: $unit;
		min-width: 0;
	}

	.tag-title {
		font-size: 1rem;
		font-weight: 600;
		margin: 0;
		color: $gray-10;
		line-height: 1.4;
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
		color: $gray-30;
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
		border: 1px solid $gray-85;
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
		color: $gray-20;
		cursor: pointer;
		transition: background-color 0.2s ease;

		&:hover {
			background-color: $gray-95;
		}

		&.danger {
			color: $red-60;
		}
	}

	.dropdown-divider {
		height: 1px;
		background-color: $gray-80;
		margin: $unit-half 0;
	}
</style>
