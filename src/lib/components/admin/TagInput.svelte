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
		label?: string
		placeholder?: string
		maxTags?: number
		disabled?: boolean
		size?: 'small' | 'medium' | 'large' | 'jumbo'
		onTagAdd?: (tag: Tag) => void
		onTagRemove?: (tag: Tag) => void
	}

	let {
		tags = $bindable([]),
		label,
		placeholder = 'Add tags...',
		maxTags = 10,
		disabled = false,
		size = 'medium',
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

	// Focus input when clicking container
	function handleContainerClick() {
		inputElement?.focus()
	}

	// Click outside to close
	function handleClickOutside(e: MouseEvent) {
		if (!(e.target as Element).closest('.tag-input-wrapper')) {
			showSuggestions = false
			selectedIndex = -1
		}
	}

	$effect(() => {
		document.addEventListener('click', handleClickOutside)
		return () => document.removeEventListener('click', handleClickOutside)
	})
</script>

<div class="tag-input-wrapper">
	{#if label}
		<label class="input-label">{label}</label>
	{/if}

	<div class="tag-input-container">
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="tag-pills tag-pills-{size}" class:has-tags={tags.length > 0} onclick={handleContainerClick}>
			{#each tags as tag (tag.id)}
				<span class="tag-pill">
					{tag.displayName}
					<button
						type="button"
						onclick={(e) => { e.stopPropagation(); removeTag(tag) }}
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
					value={inputValue}
					oninput={handleInput}
					onkeydown={handleKeydown}
					placeholder={tags.length === 0 ? placeholder : ''}
					{disabled}
					class="tag-text-input"
					role="combobox"
					aria-expanded={showSuggestions}
					aria-haspopup="listbox"
					aria-controls="tag-suggestions"
					aria-activedescendant={selectedIndex >= 0 ? `tag-option-${selectedIndex}` : undefined}
					aria-label={label || 'Add tags'}
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
</div>

<style lang="scss">
	@import '$styles/variables';

	.tag-input-wrapper {
		display: block;
		width: 100%;
	}

	.input-label {
		display: block;
		margin-bottom: $unit;
		font-size: 14px;
		font-weight: 500;
		color: $gray-20;
	}

	.tag-input-container {
		position: relative;
		width: 100%;
	}

	.tag-pills {
		display: flex;
		flex-wrap: wrap;
		gap: $unit-half;
		border: 1px solid transparent;
		background-color: $input-background-color;
		color: $input-text-color;
		align-items: center;
		cursor: text;
		transition: all $transition-fast ease;

		&:hover {
			background-color: $input-background-color-hover;
		}

		&:focus-within {
			background-color: $input-background-color-hover;
			color: $input-text-color-hover;
		}
	}

	// Size variations matching Input component
	.tag-pills-small {
		padding: $unit calc($unit * 1.5);
		font-size: 0.75rem;
		border-radius: $corner-radius-lg;
	}

	.tag-pills-medium {
		padding: calc($unit * 1.5) $unit-2x;
		font-size: 1rem;
		border-radius: $corner-radius-2xl;
	}

	.tag-pills-large {
		padding: $unit-2x $unit-3x;
		font-size: 1.25rem;
		border-radius: $corner-radius-2xl;
	}

	.tag-pills-jumbo {
		padding: $unit-2x $unit-2x;
		font-size: 1.33rem;
		border-radius: $corner-radius-2xl;

		&.has-tags {
			padding: $unit;
		}
	}

	.tag-pill {
		display: inline-flex;
		align-items: center;
		gap: $unit-half;
		padding: $unit $unit-2x;
		background: $accent-color;
		border-radius: $corner-radius-lg;
		font-size: 14px;
		color: $white;
		transition: background-color $transition-fast ease;

		&:hover {
			background: $red-50;
		}

		button {
			border: none;
			background: none;
			color: rgba(255, 255, 255, 0.7);
			cursor: pointer;
			font-size: 18px;
			line-height: 1;
			padding: $unit;
			margin: (-$unit) (-$unit) (-$unit) (-$unit-half);
			width: 16px;
			height: 16px;
			box-sizing: content-box;
			display: flex;
			align-items: center;
			justify-content: center;

			&:hover {
				color: $white;
			}

			&:disabled {
				cursor: not-allowed;
				opacity: 0.5;
			}
		}
	}

	.tag-text-input {
		flex: 1;
		border: none;
		outline: none;
		background: none;
		font-size: inherit;
		color: inherit;
		min-width: 120px;
		padding: 0;

		&::placeholder {
			color: $gray-50;
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
		border-radius: $corner-radius-2xl;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		max-height: 200px;
		overflow-y: auto;
	}

	.suggestion-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		padding: $unit-2x $unit-3x;
		border: none;
		background: none;
		cursor: pointer;
		text-align: left;
		font-size: $font-size;

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
		font-size: $font-size-small;
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
