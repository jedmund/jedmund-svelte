<script lang="ts">
	import AdminFilters from '../AdminFilters.svelte'
	import Select from '../Select.svelte'
	import Input from '../Input.svelte'
	let {
		filterType,
		publishedFilter,
		sortBy,
		searchQuery = $bindable(),
		onType,
		onPublished,
		onSort
	}: {
		filterType: string
		publishedFilter: string
		sortBy: string
		searchQuery: string
		onType: (value: string) => void
		onPublished: (value: string) => void
		onSort: (value: string) => void
	} = $props()
	// Filter options
	const typeFilterOptions = [
		{ value: 'all', label: 'All types' },
		{ value: 'image', label: 'Images' },
		{ value: 'video', label: 'Videos' },
		{ value: 'audio', label: 'Audio' },
		{ value: 'vector', label: 'Vectors' }
	]

	const publishedFilterOptions = [
		{ value: 'all', label: 'Published in' },
		{ value: 'photos', label: 'Photos' },
		{ value: 'universe', label: 'Universe' },
		{ value: 'unpublished', label: 'Unpublished' }
	]

	const sortOptions = [
		{ value: 'newest', label: 'Newest first' },
		{ value: 'oldest', label: 'Oldest first' },
		{ value: 'name-asc', label: 'Name (A-Z)' },
		{ value: 'name-desc', label: 'Name (Z-A)' },
		{ value: 'size-asc', label: 'Size (smallest)' },
		{ value: 'size-desc', label: 'Size (largest)' }
	]
</script>

<div class="listing-filters">
	<AdminFilters>
		{#snippet left()}
			<Select
				value={filterType}
				options={typeFilterOptions}
				size="small"
				variant="minimal"
				onchange={(e) => onType((e.target as HTMLSelectElement).value)}
			/>
			<Select
				value={publishedFilter}
				options={publishedFilterOptions}
				size="small"
				variant="minimal"
				onchange={(e) => onPublished((e.target as HTMLSelectElement).value)}
			/>
		{/snippet}
		{#snippet right()}
			<Select
				value={sortBy}
				options={sortOptions}
				size="small"
				variant="minimal"
				onchange={(e) => onSort((e.target as HTMLSelectElement).value)}
			/>
			<Input
				type="search"
				bind:value={searchQuery}
				placeholder="Search files..."
				size="small"
				fullWidth={false}
				pill={true}
				prefixIcon
			>
				{#snippet prefix()}<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
						/>
					</svg>{/snippet}
			</Input>
		{/snippet}
	</AdminFilters>
</div>

<style lang="scss">
	// Ensure search input matches filter dropdown sizing
	.listing-filters :global(.admin-filters) {
		:global(input[type='search']) {
			height: 36px; // Match Select component small size
			font-size: 0.875rem; // Match Select component font size
			min-width: 200px; // Wider to show full placeholder
		}

		// Make the sort dropdown narrower
		:global(.filters-right) {
			:global(.select:first-child) {
				min-width: 140px;
				max-width: 160px;
			}
		}
	}
</style>
