<script lang="ts">
	import { goto } from '$app/navigation'
	import { onMount, onDestroy } from 'svelte'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import AdminHeader from '$lib/components/admin/AdminHeader.svelte'
	import AdminFilters from '$lib/components/admin/AdminFilters.svelte'
	import GardenListItem from '$lib/components/admin/GardenListItem.svelte'
	import DeleteConfirmationModal from '$lib/components/admin/DeleteConfirmationModal.svelte'
	import EmptyState from '$lib/components/admin/EmptyState.svelte'
	import Button from '$lib/components/admin/Button.svelte'
	import Select from '$lib/components/admin/Select.svelte'
	import { createListFilters, commonSorts } from '$lib/admin/listFilters.svelte'
	import { createCollectionSession } from '$lib/admin/collection'
	import { loadGardenItems, deleteGardenItem } from '$lib/admin/garden-requests'
	import { toast } from '$lib/stores/toast'
	import { GARDEN_CATEGORIES } from '$lib/constants/garden'
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

	const collection = createCollectionSession<GardenItem>((next, loading, error) => {
		items = next
		isLoading = loading
		if (error) toast.error(error)
	})
	onMount(() => {
		void collection.load(loadGardenItems)
	})
	onDestroy(() => collection.dispose())

	function handleEdit(item: GardenItem) {
		goto(`/admin/garden/${item.id}/edit`)
	}

	function handleDelete(item: GardenItem) {
		itemToDelete = item
		showDeleteModal = true
	}

	async function confirmDelete() {
		const item = itemToDelete
		if (!item) return
		try {
			if (await collection.mutate(item.id, (signal) => deleteGardenItem(item.id, signal))) {
				await collection.load(loadGardenItems)
				toast.success('Item deleted')
				if (itemToDelete?.id === item.id) {
					showDeleteModal = false
					itemToDelete = null
				}
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to delete item')
		}
	}

	function cancelDelete() {
		showDeleteModal = false
		itemToDelete = null
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
				<GardenListItem
					{item}
					open={openDropdownId === item.id}
					onedit={handleEdit}
					ondelete={handleDelete}
					ontoggle={(event) => {
						event.stopPropagation()
						openDropdownId = openDropdownId === item.id ? null : item.id
					}}
					onclose={() => (openDropdownId = null)}
				/>
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

	.loading {
		text-align: center;
		padding: $unit-6x;
		color: $gray-40;
	}
</style>
