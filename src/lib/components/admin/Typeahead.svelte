<script lang="ts">
	import TypeaheadResults from './TypeaheadResults.svelte'
	import { onDestroy, untrack, tick } from 'svelte'
	import { createSuggestionSearch } from '$lib/admin/suggestions'
	import { clickOutside } from '$lib/actions/clickOutside'
	import CategoryPicker from './CategoryPicker.svelte'
	import type { GardenCategory } from '$lib/constants/garden'
	import type { TypeaheadResult, TypeaheadSelection } from '$lib/types/garden'

	interface Props {
		value?: string
		category: GardenCategory
		onCategoryChange?: (cat: GardenCategory) => void
		search: ((query: string) => Promise<TypeaheadResult[]>) | null
		onSelect?: (selection: TypeaheadSelection) => void
		oninput?: () => void
		placeholder?: string
		emptyText?: string
	}

	let {
		value = $bindable(''),
		category,
		onCategoryChange,
		search,
		onSelect,
		oninput: onInputCallback,
		placeholder = 'Search...',
		emptyText = 'No results found'
	}: Props = $props()

	let showResults = $state(false)
	let selectedIndex = $state(-1)
	let results = $state<TypeaheadResult[]>([])
	let isLoading = $state(false)
	let inputEl: HTMLInputElement | undefined = $state()
	let inputId = `typeahead-${Math.random().toString(36).substr(2, 9)}`

	let disposed = false
	export async function focusAndSearch() {
		await tick()
		if (!disposed) {
			inputEl?.focus()
			inputEl?.select()

			if (search && value.length >= 2) {
				showResults = true
				suggestionSearch.query(value)
			}
		}
	}

	const placeholderAspectRatio = $derived.by(() => {
		switch (category) {
			case 'books':
			case 'manga':
				return '180 / 293'
			case 'games':
				return '264 / 352'
			default:
				return '1'
		}
	})

	const suggestionSearch = createSuggestionSearch<TypeaheadResult>(
		(query) => search?.(query) ?? Promise.resolve([]),
		(state) => {
			results = state.results
			isLoading = state.loading
		}
	)
	onDestroy(() => {
		disposed = true
		suggestionSearch.dispose()
	})
	$effect(() => {
		void category
		void search
		untrack(() => {
			if (showResults && search) suggestionSearch.query(value)
			else suggestionSearch.clear()
		})
	})

	function handleInput() {
		selectedIndex = -1

		if (search) {
			showResults = value.length >= 2

			if (value.length >= 2) {
				suggestionSearch.query(value)
			} else {
				suggestionSearch.clear()
			}
		}

		onInputCallback?.()
	}

	function selectResult(result: TypeaheadResult) {
		value = result.name
		showResults = false
		selectedIndex = -1
		suggestionSearch.clear()

		onSelect?.({ category, result })
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!search) return

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault()
				if (showResults && results.length > 0) {
					selectedIndex = Math.min(selectedIndex + 1, results.length - 1)
				}
				break

			case 'ArrowUp':
				e.preventDefault()
				if (showResults) {
					selectedIndex = Math.max(selectedIndex - 1, -1)
				}
				break

			case 'Enter':
				if (selectedIndex >= 0 && results[selectedIndex]) {
					e.preventDefault()
					selectResult(results[selectedIndex])
				}
				break

			case 'Escape':
				showResults = false
				selectedIndex = -1
				break
		}
	}

	async function handleCategoryChange(newCategory: GardenCategory) {
		onCategoryChange?.(newCategory)
		suggestionSearch.clear()
		selectedIndex = -1

		// Re-fire search if there's text and the new category has search
		if (value.length >= 2 && search) {
			showResults = true
			suggestionSearch.query(value)
		}

		// Focus the input and select all text after category selection
		await tick()
		if (!disposed) {
			inputEl?.focus()
			inputEl?.select()
		}
	}

	function closeResults() {
		showResults = false
		selectedIndex = -1
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="typeahead-wrapper"
	onkeydown={handleKeydown}
	use:clickOutside={{ callback: closeResults, enabled: showResults }}
>
	<div class="typeahead-input-container">
		{#if onCategoryChange}
			<div class="typeahead-left">
				<CategoryPicker {category} onCategoryChange={handleCategoryChange} />
			</div>
		{/if}

		<input
			bind:this={inputEl}
			bind:value
			id={inputId}
			type={search ? 'search' : 'text'}
			class="typeahead-input"
			{placeholder}
			required
			oninput={handleInput}
			role={search ? 'combobox' : undefined}
			aria-expanded={search ? showResults : undefined}
			aria-haspopup={search ? 'listbox' : undefined}
			aria-controls={search ? `${inputId}-results` : undefined}
			aria-activedescendant={selectedIndex >= 0
				? `${inputId}-results-option-${selectedIndex}`
				: undefined}
		/>
	</div>

	<TypeaheadResults
		showResults={Boolean(search) && showResults}
		{results}
		{isLoading}
		{selectedIndex}
		onselect={selectResult}
		{placeholderAspectRatio}
		{emptyText}
		listId={`${inputId}-results`}
	/>
</div>

<style lang="scss">
	.typeahead-wrapper {
		position: relative;
		width: 100%;
	}

	.typeahead-input-container {
		display: flex;
		align-items: stretch;
		background-color: $input-background-color;
		border: 1px solid transparent;
		border-radius: $corner-radius-full;
		padding: 0;
		transition: all $transition-fast ease;

		&:hover {
			background-color: $input-background-color-hover;
		}

		&:focus-within {
			background-color: $input-background-color-hover;
		}
	}

	.typeahead-left {
		display: flex;
		align-items: stretch;
		padding: $unit 0 $unit $unit;
	}

	.typeahead-input {
		flex: 1;
		width: 100%;
		border: none;
		background: transparent;
		color: $input-text-color;
		font-size: $font-size-med;
		padding: $unit-2x $unit-3x $unit-2x calc($unit * 1.5);
		outline: none;

		&::placeholder {
			color: $gray-50;
		}

		&::-webkit-search-decoration,
		&::-webkit-search-cancel-button {
			-webkit-appearance: none;
		}
	}
</style>
