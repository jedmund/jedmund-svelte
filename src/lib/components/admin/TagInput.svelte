<script lang="ts">
	import { debounce } from '$lib/utils/debounce'

	interface Tag {
		id: number
		name: string
		displayName: string
		slug: string
		usageCount?: number
	}

	interface TagInputProps {
		tags?: Tag[]
		placeholder?: string
		maxTags?: number
		disabled?: boolean
		onTagAdd?: (tag: Tag) => void
		onTagRemove?: (tag: Tag) => void
	}

	let {
		tags = $bindable([]),
		placeholder = 'Add tags...',
		maxTags = 10,
		disabled = false,
		onTagAdd,
		onTagRemove
	}: TagInputProps = $props()

	let inputValue = $state('')
	let showSuggestions = $state(false)
	let selectedIndex = $state(-1)
	let suggestions = $state<Tag[]>([])
	let isLoadingSuggestions = $state(false)
	let inputElement = $state.raw<HTMLInputElement>()

	// Filtered suggestions (exclude already added tags)
	let filteredSuggestions = $derived(
		suggestions.filter((tag) => !tags.some((t) => t.id === tag.id))
	)

	// Debounced suggestion fetching
	const fetchSuggestions = debounce(async (query: string) => {
		if (query.length < 2) {
			suggestions = []
			return
		}

		isLoadingSuggestions = true
		try {
			const res = await fetch(`/api/tags/suggest?q=${encodeURIComponent(query)}&limit=5`)
			const data = await res.json()
			suggestions = data.suggestions
		} catch (error) {
			console.error('Failed to fetch suggestions:', error)
			suggestions = []
		} finally {
			isLoadingSuggestions = false
		}
	}, 200)

	// Handle input changes
	function handleInput(e: Event) {
		const value = (e.target as HTMLInputElement).value
		inputValue = value
		selectedIndex = -1
		showSuggestions = value.length >= 2

		if (value.length >= 2) {
			fetchSuggestions(value)
		} else {
			suggestions = []
		}
	}

	// Add existing tag from suggestions
	async function addExistingTag(tag: Tag) {
		if (tags.length >= maxTags) return

		tags = [...tags, tag]
		onTagAdd?.(tag)

		inputValue = ''
		suggestions = []
		showSuggestions = false
		selectedIndex = -1
		inputElement?.focus()
	}

	// Create and add new tag
	async function createNewTag(name: string) {
		if (tags.length >= maxTags) return

		try {
			const res = await fetch('/api/tags', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name }),
				credentials: 'same-origin'
			})

			if (!res.ok) {
				const error = await res.json()
				alert(error.error.message)
				return
			}

			const { tag } = await res.json()
			tags = [...tags, tag]
			onTagAdd?.(tag)

			inputValue = ''
			showSuggestions = false
			inputElement?.focus()
		} catch (error) {
			console.error('Failed to create tag:', error)
			alert('Failed to create tag. Please try again.')
		}
	}

	// Remove tag
	function removeTag(tag: Tag) {
		tags = tags.filter((t) => t.id !== tag.id)
		onTagRemove?.(tag)
	}

	// Keyboard navigation
	function handleKeydown(e: KeyboardEvent) {
		if (disabled) return

		switch (e.key) {
			case 'Enter':
				e.preventDefault()
				if (selectedIndex >= 0 && filteredSuggestions[selectedIndex]) {
					addExistingTag(filteredSuggestions[selectedIndex])
				} else if (inputValue.trim()) {
					createNewTag(inputValue.trim())
				}
				break

			case 'ArrowDown':
				e.preventDefault()
				if (showSuggestions && filteredSuggestions.length > 0) {
					selectedIndex = Math.min(selectedIndex + 1, filteredSuggestions.length - 1)
				}
				break

			case 'ArrowUp':
				e.preventDefault()
				if (showSuggestions) {
					selectedIndex = Math.max(selectedIndex - 1, -1)
				}
				break

			case 'Backspace':
				if (!inputValue && tags.length > 0) {
					removeTag(tags[tags.length - 1])
				}
				break

			case 'Escape':
				showSuggestions = false
				selectedIndex = -1
				inputElement?.blur()
				break
		}
	}

	// Click outside to close
	function handleClickOutside(e: MouseEvent) {
		if (!(e.target as Element).closest('.tag-input-container')) {
			showSuggestions = false
			selectedIndex = -1
		}
	}

	$effect(() => {
		document.addEventListener('click', handleClickOutside)
		return () => document.removeEventListener('click', handleClickOutside)
	})
</script>

<div class="tag-input-container">
	<!-- Tag pills -->
	<div class="tag-pills">
		{#each tags as tag (tag.id)}
			<span class="tag-pill">
				{tag.displayName}
				<button
					type="button"
					onclick={() => removeTag(tag)}
					aria-label="Remove {tag.displayName}"
					{disabled}
				>
					×
				</button>
			</span>
		{/each}

		<!-- Input -->
		{#if tags.length < maxTags}
			<input
				bind:this={inputElement}
				type="text"
				bind:value={inputValue}
				oninput={handleInput}
				onkeydown={handleKeydown}
				placeholder={tags.length === 0 ? placeholder : ''}
				{disabled}
				class="tag-input"
				role="combobox"
				aria-expanded={showSuggestions}
				aria-haspopup="listbox"
				aria-controls="tag-suggestions"
				aria-activedescendant={selectedIndex >= 0 ? `tag-option-${selectedIndex}` : undefined}
				aria-label="Add tags"
			/>
		{/if}
	</div>

	<!-- Suggestions dropdown -->
	{#if showSuggestions}
		<div class="tag-suggestions" id="tag-suggestions" role="listbox">
			{#if isLoadingSuggestions}
				<div class="suggestion-loading">
					<span class="spinner"></span>
					Searching...
				</div>
			{:else if filteredSuggestions.length > 0}
				{#each filteredSuggestions as tag, i (tag.id)}
					<button
						type="button"
						class="suggestion-item"
						class:selected={selectedIndex === i}
						onclick={() => addExistingTag(tag)}
						id="tag-option-{i}"
						role="option"
						aria-selected={selectedIndex === i}
					>
						<span class="suggestion-name">{tag.displayName}</span>
						{#if tag.usageCount !== undefined}
							<span class="suggestion-count">{tag.usageCount}</span>
						{/if}
					</button>
				{/each}
			{:else}
				<div class="suggestion-empty">No matching tags</div>
			{/if}
		</div>
	{/if}
</div>

<style lang="scss">
	@import '$styles/variables';

	.tag-input-container {
		position: relative;
		width: 100%;
	}

	.tag-pills {
		display: flex;
		flex-wrap: wrap;
		gap: $unit-half;
		padding: $unit;
		border: 1px solid $gray-85;
		border-radius: $corner-radius-sm;
		background: $white;
		min-height: 40px;
		align-items: center;

		&:focus-within {
			outline: none;
			border-color: $blue-50;
			box-shadow: 0 0 0 3px rgba($blue-50, 0.1);
		}
	}

	.tag-pill {
		display: inline-flex;
		align-items: center;
		gap: $unit-half;
		padding: 4px $unit;
		background: $gray-90;
		border-radius: $corner-radius-sm;
		font-size: 14px;
		color: $gray-20;

		button {
			border: none;
			background: none;
			color: $gray-40;
			cursor: pointer;
			font-size: 18px;
			line-height: 1;
			padding: 0;
			width: 16px;
			height: 16px;
			display: flex;
			align-items: center;
			justify-content: center;

			&:hover {
				color: $gray-10;
			}

			&:disabled {
				cursor: not-allowed;
				opacity: 0.5;
			}
		}
	}

	.tag-input {
		flex: 1;
		border: none;
		outline: none;
		background: none;
		font-size: 14px;
		min-width: 120px;

		&::placeholder {
			color: $gray-60;
		}

		&:disabled {
			cursor: not-allowed;
			opacity: 0.5;
		}
	}

	.tag-suggestions {
		position: absolute;
		top: calc(100% + $unit-half);
		left: 0;
		right: 0;
		z-index: 100;
		background: $white;
		border: 1px solid $gray-85;
		border-radius: $corner-radius-sm;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		max-height: 200px;
		overflow-y: auto;
	}

	.suggestion-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		padding: $unit $unit-2x;
		border: none;
		background: none;
		cursor: pointer;
		text-align: left;
		font-size: 14px;

		&:hover,
		&.selected {
			background: $gray-95;
		}
	}

	.suggestion-name {
		color: $gray-10;
	}

	.suggestion-count {
		color: $gray-60;
		font-size: 12px;
	}

	.suggestion-loading,
	.suggestion-empty {
		padding: $unit-2x;
		text-align: center;
		color: $gray-60;
		font-size: 14px;
	}

	.suggestion-loading {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: $unit;
	}

	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid $gray-90;
		border-top-color: $blue-50;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
