<script lang="ts">
	import MediaPagination from '$lib/components/admin/media/MediaPagination.svelte'
	import ListingActions from '$lib/components/admin/media/ListingActions.svelte'
	import ListingFilters from '$lib/components/admin/media/ListingFilters.svelte'
	import ListingMediaTile from '$lib/components/admin/media/ListingMediaTile.svelte'
	import { goto, invalidate } from '$app/navigation'
	import { page } from '$app/stores'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import AdminHeader from '$lib/components/admin/AdminHeader.svelte'
	import EmptyState from '$lib/components/admin/EmptyState.svelte'
	import Button from '$lib/components/admin/Button.svelte'
	import DropdownMenuContainer from '$lib/components/admin/DropdownMenuContainer.svelte'
	import DropdownItem from '$lib/components/admin/DropdownItem.svelte'
	import MediaDetailsModal from '$lib/components/admin/MediaDetailsModal.svelte'
	import MediaUploadModal from '$lib/components/admin/MediaUploadModal.svelte'
	import AlbumSelectorModal from '$lib/components/admin/AlbumSelectorModal.svelte'
	import ChevronDown from '$icons/chevron-down.svg?component'
	import { toast } from '$lib/stores/toast'
	import { createListingOperations } from '$lib/admin/media/listing-operations.svelte'
	import type { Media } from '@prisma/client'
	import type { PageData } from './$types'

	const { data } = $props<{ data: PageData }>()

	const media = $derived(data.items ?? [])
	const currentPage = $derived(data.pagination?.page ?? 1)
	const totalPages = $derived(data.pagination?.totalPages ?? 1)

	// Read filter states from URL
	const filterType = $derived($page.url.searchParams.get('mimeType') ?? 'all')
	const publishedFilter = $derived($page.url.searchParams.get('publishedFilter') ?? 'all')
	const sortBy = $derived($page.url.searchParams.get('sort') ?? 'newest')

	let searchQuery = $state($page.url.searchParams.get('search') ?? '')
	let searchTimeout: ReturnType<typeof setTimeout>

	// Modal states
	let selectedMedia = $state<Media | null>(null)
	let isDetailsModalOpen = $state(false)
	let isUploadModalOpen = $state(false)
	let showBulkAlbumModal = $state(false)

	// Multiselect states
	let isMultiSelectMode = $state(false)
	const operations = createListingOperations(() => (isMultiSelectMode = false))

	// Dropdown state
	let isDropdownOpen = $state(false)

	// Watch for search query changes with debounce
	$effect(() => {
		if (searchQuery !== undefined) {
			clearTimeout(searchTimeout)
			searchTimeout = setTimeout(() => {
				updateURL({ search: searchQuery || undefined })
			}, 300)
			return () => clearTimeout(searchTimeout)
		}
	})

	function updateURL(params: Record<string, string | undefined>) {
		const url = new URL($page.url)

		// Update or remove params
		Object.entries(params).forEach(([key, value]) => {
			if (value && value !== 'all') {
				url.searchParams.set(key, value)
			} else {
				url.searchParams.delete(key)
			}
		})

		// Reset to page 1 if filters changed (not page navigation)
		if (!params.page) {
			url.searchParams.delete('page')
		}

		goto(url.toString(), { replaceState: false, keepFocus: true }).catch(() =>
			toast.error('Could not update media filters')
		)
	}

	function handlePageChange(page: number) {
		updateURL({ page: String(page) })
	}

	function handleTypeFilterChange(value: string) {
		updateURL({ mimeType: value })
	}

	function handlePublishedFilterChange(value: string) {
		updateURL({ publishedFilter: value })
	}

	function handleSortChange(value: string) {
		updateURL({ sort: value })
	}

	function handleMediaClick(item: Media) {
		selectedMedia = item
		isDetailsModalOpen = true
	}

	function handleModalClose() {
		void invalidate('admin:media').catch(() => toast.error('Could not refresh media'))
		selectedMedia = null
		isDetailsModalOpen = false
	}

	async function handleMediaUpdate(_updatedMedia: Media) {
		// Invalidate to reload from server
		await invalidate('admin:media').catch(() => toast.error('Saved, but media could not refresh'))
	}

	async function handleUploadComplete() {
		// Reload media list after successful upload
		await invalidate('admin:media').catch(() => toast.error('Saved, but media could not refresh'))
	}

	function openUploadModal() {
		isUploadModalOpen = true
		isDropdownOpen = false
	}

	function handleDropdownToggle(e: MouseEvent) {
		e.stopPropagation()
		isDropdownOpen = !isDropdownOpen
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement
		if (!target.closest('.actions-dropdown')) {
			isDropdownOpen = false
		}
	}

	function handleAuditStorage() {
		goto('/admin/media/audit').catch(() => toast.error('Could not open storage audit'))
	}

	$effect(() => {
		if (isDropdownOpen) {
			document.addEventListener('click', handleClickOutside)
			return () => document.removeEventListener('click', handleClickOutside)
		}
	})

	// Multiselect functions
	function toggleMultiSelectMode() {
		isMultiSelectMode = !isMultiSelectMode
		isDropdownOpen = false
		if (!isMultiSelectMode) {
			operations.clear()
		}
	}

	function selectAllMedia() {
		operations.selectAll(media.map((item: Media) => item.id))
	}
</script>

<svelte:head>
	<title>Media Library - Admin @jedmund</title>
</svelte:head>

<AdminPage>
	{#snippet header()}
		<AdminHeader title="Media Library">
			{#snippet actions()}
				<div class="actions-dropdown">
					<Button variant="primary" buttonSize="medium" onclick={openUploadModal}>Upload</Button>
					<Button variant="ghost" iconOnly buttonSize="medium" onclick={handleDropdownToggle}>
						{#snippet icon()}
							<ChevronDown />
						{/snippet}
					</Button>

					{#if isDropdownOpen}
						<DropdownMenuContainer>
							<DropdownItem onclick={toggleMultiSelectMode}>
								{isMultiSelectMode ? 'Exit Select' : 'Select Files'}
							</DropdownItem>
							<DropdownItem onclick={handleAuditStorage}>Audit Storage</DropdownItem>
							<DropdownItem onclick={() => goto('/admin/media/regenerate')}>
								Regenerate Cloudinary
							</DropdownItem>
						</DropdownMenuContainer>
					{/if}
				</div>
			{/snippet}
		</AdminHeader>
	{/snippet}

	<!-- Filters -->
	<ListingFilters
		{filterType}
		{publishedFilter}
		{sortBy}
		bind:searchQuery
		onType={handleTypeFilterChange}
		onPublished={handlePublishedFilterChange}
		onSort={handleSortChange}
	/>

	{#if isMultiSelectMode && media.length > 0}
		<ListingActions
			total={media.length}
			selectedCount={operations.selectedIds.size}
			busy={operations.busy}
			onSelectAll={selectAllMedia}
			onClear={operations.clear}
			onMark={operations.markPhotography}
			onUnmark={operations.unmarkPhotography}
			onDelete={operations.delete}
			onAlbums={() => (showBulkAlbumModal = true)}
		/>
	{/if}

	{#if media.length === 0}
		<EmptyState title="No media files found" message="Upload your first file to get started.">
			{#snippet action()}
				<Button variant="primary" onclick={openUploadModal}>Upload your first file</Button>
			{/snippet}
		</EmptyState>
	{:else}
		<div class="media-grid">
			{#each media as item}
				<ListingMediaTile
					{item}
					{isMultiSelectMode}
					selected={operations.selectedIds.has(item.id)}
					onSelect={() => operations.toggle(item.id)}
					onOpen={() => handleMediaClick(item)}
				/>
			{/each}
		</div>
	{/if}

	<MediaPagination {currentPage} {totalPages} onPage={handlePageChange} />
</AdminPage>

<!-- Media Details Modal -->
<MediaDetailsModal
	bind:isOpen={isDetailsModalOpen}
	media={selectedMedia}
	onClose={handleModalClose}
	onUpdate={handleMediaUpdate}
/>

<!-- Media Upload Modal -->
<MediaUploadModal
	bind:isOpen={isUploadModalOpen}
	onClose={() => (isUploadModalOpen = false)}
	onUploadComplete={handleUploadComplete}
/>

<!-- Bulk Album Modal -->
<AlbumSelectorModal
	bind:isOpen={showBulkAlbumModal}
	selectedMediaIds={Array.from(operations.selectedIds)}
	onSave={() => {
		// Optionally refresh the media list or show a success message
		operations.clear()
		isMultiSelectMode = false
	}}
/>

<style lang="scss">
	.actions-dropdown {
		position: relative;
		display: flex;
		gap: $unit-half;

		:global(svg) {
			width: 12px;
			height: 12px;
			fill: none;
			stroke: currentColor;
			stroke-width: 2;
			stroke-linecap: round;
			stroke-linejoin: round;
		}
	}

	.media-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: $unit-3x;
		margin-bottom: $unit-4x;
		padding: 0 $unit;
	}
</style>
