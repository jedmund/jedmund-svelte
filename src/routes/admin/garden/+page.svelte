<script lang="ts">
	import { goto } from '$app/navigation'
	import { onMount } from 'svelte'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import AdminHeader from '$lib/components/admin/AdminHeader.svelte'
	import AdminFilters from '$lib/components/admin/AdminFilters.svelte'
	import AdminByline from '$lib/components/admin/AdminByline.svelte'
	import DeleteConfirmationModal from '$lib/components/admin/DeleteConfirmationModal.svelte'
	import EmptyState from '$lib/components/admin/EmptyState.svelte'
	import Button from '$lib/components/admin/Button.svelte'
	import Select from '$lib/components/admin/Select.svelte'
	import { createListFilters, commonSorts } from '$lib/admin/listFilters.svelte'
	import { api } from '$lib/admin/api'
	import { toast } from '$lib/stores/toast'
	import { getCategoryLabel, GARDEN_CATEGORIES } from '$lib/constants/garden'
	import { clickOutside } from '$lib/actions/clickOutside'
	import type { GardenItem } from '@prisma/client'

	let items = $state<GardenItem[]>([])
	let isLoading = $state(true)
	let showDeleteModal = $state(false)
	let itemToDelete: GardenItem | null = $state(null)
	let openDropdownId = $state<number | null>(null)

	const filters = createListFilters(() => items, {
		filters: {
			category: { field: 'category' as keyof GardenItem, default: 'all' },
			status: { field: 'isCurrent' as keyof GardenItem, default: 'all' }
		},
		sorts: {
			newest: commonSorts.dateDesc<GardenItem>('createdAt'),
			oldest: commonSorts.dateAsc<GardenItem>('createdAt'),
			'title-asc': commonSorts.stringAsc<GardenItem>('title'),
			'title-desc': commonSorts.stringDesc<GardenItem>('title')
		},
		defaultSort: 'newest'
	})

	const categoryFilterOptions = [
		{ value: 'all', label: 'All categories' },
		...GARDEN_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))
	]

	const statusFilterOptions = [
		{ value: 'all', label: 'All items' },
		{ value: 'true', label: 'Currently enjoying' },
		{ value: 'favorite', label: 'Favorites' }
	]

	const sortOptions = [
		{ value: 'newest', label: 'Newest first' },
		{ value: 'oldest', label: 'Oldest first' },
		{ value: 'title-asc', label: 'Title (A-Z)' },
		{ value: 'title-desc', label: 'Title (Z-A)' }
	]

	// Custom filter logic since status filter maps to different fields
	const filteredItems = $derived.by(() => {
		let result = [...items]

		const categoryValue = filters.values.category
		if (categoryValue !== 'all') {
			result = result.filter((item) => item.category === categoryValue)
		}

		const statusValue = filters.values.status
		if (statusValue === 'true') {
			result = result.filter((item) => item.isCurrent)
		} else if (statusValue === 'favorite') {
			result = result.filter((item) => item.isFavorite)
		}

		// Apply sort
		const sortKey = filters.sort
		const sortFns: Record<string, (a: GardenItem, b: GardenItem) => number> = {
			newest: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
			oldest: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
			'title-asc': (a, b) => a.title.localeCompare(b.title),
			'title-desc': (a, b) => b.title.localeCompare(a.title)
		}
		if (sortFns[sortKey]) {
			result.sort(sortFns[sortKey])
		}

		return result
	})

	onMount(async () => {
		await loadItems()
	})

	async function loadItems() {
		try {
			const data = await api.get<{ items: GardenItem[] }>('/api/admin/garden')
			items = data.items
		} catch (err) {
			toast.error('Failed to load garden items')
			console.error(err)
		} finally {
			isLoading = false
		}
	}

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

	function handleEdit(item: GardenItem) {
		goto(`/admin/garden/${item.id}/edit`)
	}

	function handleDelete(item: GardenItem) {
		itemToDelete = item
		showDeleteModal = true
	}

	async function confirmDelete() {
		if (!itemToDelete) return

		try {
			await api.delete(`/api/admin/garden/${itemToDelete.id}`)
			items = items.filter((i) => i.id !== itemToDelete!.id)
			toast.success('Item deleted')
		} catch (err) {
			toast.error('Failed to delete item')
			console.error(err)
		} finally {
			showDeleteModal = false
			itemToDelete = null
		}
	}

	function cancelDelete() {
		showDeleteModal = false
		itemToDelete = null
	}

	function toggleDropdown(event: MouseEvent, itemId: number) {
		event.stopPropagation()
		openDropdownId = openDropdownId === itemId ? null : itemId
	}

	function buildByline(item: GardenItem): string[] {
		const sections: string[] = [getCategoryLabel(item.category)]
		if (item.isCurrent) sections.push('Current')
		if (item.isFavorite) sections.push('Favorite')
		sections.push(formatRelativeTime(item.createdAt as unknown as string))
		return sections
	}
</script>

<svelte:head>
	<title>Garden - Admin @jedmund</title>
</svelte:head>

<AdminPage>
	{#snippet header()}
		<AdminHeader title="Garden">
			{#snippet actions()}
				<Button variant="primary" buttonSize="medium" onclick={() => goto('/admin/garden/new')}>
					New item
				</Button>
			{/snippet}
		</AdminHeader>
	{/snippet}

	<AdminFilters>
		{#snippet left()}
			<Select
				value={String(filters.values.category)}
				options={categoryFilterOptions}
				size="small"
				variant="minimal"
				onchange={(e) => filters.set('category', (e.target as HTMLSelectElement).value)}
			/>
			<Select
				value={String(filters.values.status)}
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

	{#if isLoading}
		<div class="loading">Loading...</div>
	{:else if filteredItems.length === 0}
		<EmptyState
			title="No items found"
			message={filters.values.category === 'all' && filters.values.status === 'all'
				? 'Add your first garden item to get started!'
				: 'No items match the current filters.'}
		/>
	{:else}
		<div class="items-list">
			{#each filteredItems as item (item.id)}
				<div
					class="item-row"
					role="button"
					tabindex="0"
					onclick={() => handleEdit(item)}
					onkeydown={(e) => e.key === 'Enter' && handleEdit(item)}
				>
					<div class="item-thumbnail">
						{#if item.imageUrl}
							<img src={item.imageUrl} alt={item.title} />
						{:else}
							<div class="placeholder-icon">
								{getCategoryLabel(item.category).charAt(0)}
							</div>
						{/if}
					</div>

					<div class="item-info">
						<h3 class="item-title">{item.title}</h3>
						<AdminByline sections={buildByline(item)} />
					</div>

					<div
						class="dropdown-container"
						use:clickOutside={{ enabled: openDropdownId === item.id }}
						onclickoutside={() => (openDropdownId = null)}
					>
						<button
							class="action-button"
							type="button"
							onclick={(e) => toggleDropdown(e, item.id)}
							aria-label="Item actions"
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

						{#if openDropdownId === item.id}
							<div class="dropdown-menu">
								<button
									class="dropdown-item"
									type="button"
									onclick={() => {
										openDropdownId = null
										handleEdit(item)
									}}
								>
									Edit
								</button>
								<div class="dropdown-divider"></div>
								<button
									class="dropdown-item danger"
									type="button"
									onclick={() => {
										openDropdownId = null
										handleDelete(item)
									}}
								>
									Delete
								</button>
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</AdminPage>

<DeleteConfirmationModal
	bind:isOpen={showDeleteModal}
	title="Delete Item?"
	message="Are you sure you want to delete this item? This action cannot be undone."
	confirmText="Delete Item"
	onConfirm={confirmDelete}
	onCancel={cancelDelete}
/>

<style lang="scss">
	.items-list {
		display: flex;
		flex-direction: column;
		gap: $unit-2x;
	}

	.item-row {
		display: flex;
		align-items: center;
		gap: $unit-2x;
		padding: $unit-2x;
		background: white;
		border-radius: $unit-2x;
		cursor: pointer;
		transition: all 0.2s ease;

		&:hover {
			background-color: $gray-95;

			.item-thumbnail {
				box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
			}
		}
	}

	.item-thumbnail {
		flex-shrink: 0;
		width: 60px;
		border-radius: $unit;
		overflow: hidden;
		background-color: $gray-95;
		transition: box-shadow 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;

		img {
			width: 100%;
			height: auto;
			display: block;
		}

		.placeholder-icon {
			width: 60px;
			height: 60px;
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: 1.25rem;
			font-weight: 600;
			color: $gray-50;
		}
	}

	.item-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: $unit-half;
		min-width: 0;
	}

	.item-title {
		font-size: 1rem;
		font-weight: 600;
		color: $gray-10;
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

	.loading {
		text-align: center;
		padding: $unit-6x;
		color: $gray-40;
	}
</style>
