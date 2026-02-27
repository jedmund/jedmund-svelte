<script lang="ts">
	import { debounce } from '$lib/utils/debounce'
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
	let resultElements: HTMLButtonElement[] = $state([])
	let inputEl: HTMLInputElement | undefined = $state()
	let inputId = `typeahead-${Math.random().toString(36).substr(2, 9)}`

	export function focusAndSearch() {
		requestAnimationFrame(() => {
			inputEl?.focus()
			inputEl?.select()

			if (search && value.length >= 2) {
				showResults = true
				debouncedSearch(value)
			}
		})
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

	const debouncedSearch = debounce(async (query: string) => {
		if (!search || query.length < 2) {
			results = []
			return
		}

		isLoading = true
		try {
			results = await search(query)
		} catch (error) {
			console.error('Search failed:', error)
			results = []
		} finally {
			isLoading = false
		}
	}, 300)

	// Scroll selected result into view
	$effect(() => {
		if (selectedIndex >= 0 && resultElements[selectedIndex]) {
			resultElements[selectedIndex].scrollIntoView({ block: 'nearest' })
		}
	})

	function handleInput() {
		selectedIndex = -1

		if (search) {
			showResults = value.length >= 2

			if (value.length >= 2) {
				debouncedSearch(value)
			} else {
				results = []
			}
		}

		onInputCallback?.()
	}

	function selectResult(result: TypeaheadResult) {
		value = result.name
		showResults = false
		selectedIndex = -1
		results = []

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

	function handleCategoryChange(newCategory: GardenCategory) {
		onCategoryChange?.(newCategory)
		results = []
		selectedIndex = -1

		// Re-fire search if there's text and the new category has search
		if (value.length >= 2 && search) {
			showResults = true
			debouncedSearch(value)
		}

		// Focus the input and select all text after category selection
		requestAnimationFrame(() => {
			inputEl?.focus()
			inputEl?.select()
		})
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
			aria-controls={search ? 'typeahead-results' : undefined}
			aria-activedescendant={selectedIndex >= 0 ? `typeahead-option-${selectedIndex}` : undefined}
		/>
	</div>

	{#if search && showResults}
		<div class="typeahead-results" id="typeahead-results" role="listbox">
			{#if isLoading}
				<div class="result-loading">
					<span class="spinner"></span>
					Searching...
				</div>
			{:else if results.length > 0}
				{#each results as result, i (result.id)}
					<button
						type="button"
						class="result-item"
						class:selected={selectedIndex === i}
						onclick={() => selectResult(result)}
						bind:this={resultElements[i]}
						id="typeahead-option-{i}"
						role="option"
						aria-selected={selectedIndex === i}
					>
						{#if result.image}
							<img
								class="result-thumb"
								src={result.image}
								alt=""
							/>
						{:else}
							<div
								class="result-thumb result-thumb-placeholder"
								style:aspect-ratio={placeholderAspectRatio}
							></div>
						{/if}
						<div class="result-info">
							<span class="result-name">{result.name}</span>
							{#if result.subtitle}
								<span class="result-subtitle">{result.subtitle}</span>
							{/if}
						</div>
					</button>
				{/each}
			{:else}
				<div class="result-empty">{emptyText}</div>
			{/if}
		</div>
	{/if}
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

	.typeahead-results {
		position: absolute;
		top: calc(100% + $unit-half);
		left: 0;
		right: 0;
		z-index: 100;
		background: $white;
		border: 1px solid $gray-85;
		border-radius: $corner-radius-2xl;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		max-height: 360px;
		overflow-y: auto;
		padding: $unit;
		display: flex;
		flex-direction: column;
		gap: $unit-fourth;
	}

	.result-item {
		display: flex;
		align-items: center;
		gap: $unit-2x;
		width: 100%;
		padding: $unit-2x $unit-3x;
		border: none;
		background: none;
		cursor: pointer;
		text-align: left;
		font-size: $font-size;
		border-radius: $corner-radius-xl;

		&:hover,
		&.selected {
			background: $gray-95;
		}
	}

	.result-thumb {
		width: 56px;
		border-radius: $unit-half;
		object-fit: cover;
		flex-shrink: 0;
	}

	.result-thumb-placeholder {
		width: 56px;
		background-color: $gray-90;
	}

	.result-info {
		display: flex;
		flex-direction: column;
		gap: $unit-fourth;
		min-width: 0;
	}

	.result-name {
		color: $gray-10;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.result-subtitle {
		color: $gray-50;
		font-size: $font-size-small;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.result-loading,
	.result-empty {
		padding: $unit-2x;
		text-align: center;
		color: $gray-60;
		font-size: $font-size-small;
	}

	.result-loading {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: $unit;
	}

	.spinner {
		width: $unit-2x;
		height: $unit-2x;
		border: 2px solid $gray-90;
		border-top-color: $red-50;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
