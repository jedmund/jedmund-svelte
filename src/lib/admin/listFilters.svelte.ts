/**
 * Shared list filtering and sorting utilities for admin pages.
 * Eliminates duplication across projects, posts, and media list pages.
 */

type FilterValue = string | number | boolean

interface FilterDefinition<T> {
	field: keyof T
	default: FilterValue
}

interface FilterConfig<T> {
	[key: string]: FilterDefinition<T>
}

interface SortConfig<T> {
	[key: string]: (a: T, b: T) => number
}

interface ListFiltersConfig<T> {
	filters: FilterConfig<T>
	sorts: SortConfig<T>
	defaultSort: string
}

export interface ListFiltersResult<T> {
	/** Current filter values */
	values: Record<string, FilterValue>
	/** Current sort key */
	sort: string
	/** Filtered and sorted items */
	items: T[]
	/** Number of items after filtering */
	count: number
	/** Set a filter value */
	set: (filterKey: string, value: FilterValue) => void
	/** Set the current sort */
	setSort: (sortKey: string) => void
	/** Reset all filters to defaults */
	reset: () => void
}

/**
 * Creates a reactive list filter store using Svelte 5 runes.
 * Must be called within component context.
 *
 * @example
 * const filters = createListFilters(projects, {
 *   filters: {
 *     type: { field: 'projectType', default: 'all' },
 *     status: { field: 'status', default: 'all' }
 *   },
 *   sorts: {
 *     newest: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
 *     oldest: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
 *   },
 *   defaultSort: 'newest'
 * })
 */
export function createListFilters<T>(
	sourceItems: T[],
	config: ListFiltersConfig<T>
): ListFiltersResult<T> {
	// Initialize filter state from config defaults
	const initialValues = Object.entries(config.filters).reduce(
		(acc, [key, def]) => {
			acc[key] = def.default
			return acc
		},
		{} as Record<string, FilterValue>
	)

	let filterValues = $state<Record<string, FilterValue>>(initialValues)
	let currentSort = $state<string>(config.defaultSort)

	// Derived filtered and sorted items
	const filteredItems = $derived.by(() => {
		let result = [...sourceItems]

		// Apply all filters
		for (const [filterKey, filterDef] of Object.entries(config.filters)) {
			const value = filterValues[filterKey]
			// Skip filtering if value is 'all' (common default for show-all state)
			if (value !== 'all') {
				result = result.filter((item) => item[filterDef.field] === value)
			}
		}

		// Apply sort
		const sortFn = config.sorts[currentSort]
		if (sortFn) {
			result.sort(sortFn)
		}

		return result
	})

	return {
		get values() {
			return filterValues
		},
		get sort() {
			return currentSort
		},
		get items() {
			return filteredItems
		},
		get count() {
			return filteredItems.length
		},
		set(filterKey: string, value: FilterValue) {
			filterValues[filterKey] = value
		},
		setSort(sortKey: string) {
			currentSort = sortKey
		},
		reset() {
			filterValues = { ...initialValues }
			currentSort = config.defaultSort
		}
	}
}

/**
 * Common sort functions for reuse across list pages
 */
export const commonSorts = {
	/** Sort by date field, newest first */
	dateDesc:
		<T>(field: keyof T) =>
		(a: T, b: T) =>
			new Date(b[field] as string).getTime() - new Date(a[field] as string).getTime(),

	/** Sort by date field, oldest first */
	dateAsc:
		<T>(field: keyof T) =>
		(a: T, b: T) =>
			new Date(a[field] as string).getTime() - new Date(b[field] as string).getTime(),

	/** Sort by string field, A-Z */
	stringAsc:
		<T>(field: keyof T) =>
		(a: T, b: T) =>
			String(a[field] || '').localeCompare(String(b[field] || '')),

	/** Sort by string field, Z-A */
	stringDesc:
		<T>(field: keyof T) =>
		(a: T, b: T) =>
			String(b[field] || '').localeCompare(String(a[field] || '')),

	/** Sort by number field, ascending */
	numberAsc:
		<T>(field: keyof T) =>
		(a: T, b: T) =>
			Number(a[field]) - Number(b[field]),

	/** Sort by number field, descending */
	numberDesc:
		<T>(field: keyof T) =>
		(a: T, b: T) =>
			Number(b[field]) - Number(a[field]),

	/** Sort by status field, published first */
	statusPublishedFirst:
		<T>(field: keyof T) =>
		(a: T, b: T) => {
			if (a[field] === b[field]) return 0
			return a[field] === 'published' ? -1 : 1
		},

	/** Sort by status field, draft first */
	statusDraftFirst:
		<T>(field: keyof T) =>
		(a: T, b: T) => {
			if (a[field] === b[field]) return 0
			return a[field] === 'draft' ? -1 : 1
		}
}
