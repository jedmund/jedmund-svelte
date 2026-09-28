<script lang="ts">
	import { clickOutside } from '$lib/actions/clickOutside'
	import TagPill from './TagPill.svelte'
	import TagSuggestions from './TagSuggestions.svelte'
	import { onDestroy } from 'svelte'
	import { createSuggestionSearch } from '$lib/admin/suggestions'
	import { suggestTags, createTag, type TagSuggestion as Tag } from '$lib/admin/tag-requests'

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

	const inputId = `tag-input-${Math.random().toString(36).slice(2, 9)}`

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

	const suggestionSearch = createSuggestionSearch(
		suggestTags,
		(state) => {
			suggestions = state.results
			isLoadingSuggestions = state.loading
		},
		200
	)
	let creating = false
	let disposed = false
	onDestroy(() => {
		disposed = true
		suggestionSearch.dispose()
	})

	// Handle input changes
	function handleInput(e: Event) {
		const value = (e.target as HTMLInputElement).value
		inputValue = value
		selectedIndex = -1
		showSuggestions = value.length >= 2

		suggestionSearch.query(value)
	}

	// Add existing tag from suggestions
	function addExistingTag(tag: Tag) {
		if (disabled || tags.length >= maxTags || tags.some((item) => item.id === tag.id)) return

		tags = [...tags, tag]
		onTagAdd?.(tag)

		inputValue = ''
		suggestionSearch.clear()
		showSuggestions = false
		selectedIndex = -1
		inputElement?.focus()
	}

	// Create and add new tag
	async function createNewTag(name: string) {
		if (disabled || creating || tags.length >= maxTags) return
		creating = true
		const inputAtStart = inputValue
		try {
			const tag = await createTag(name)
			if (disposed || disabled || tags.length >= maxTags) return
			if (!tags.some((item) => item.id === tag.id)) {
				tags = [...tags, tag]
				onTagAdd?.(tag)
			}
			if (inputValue === inputAtStart) {
				inputValue = ''
				suggestionSearch.clear()
				showSuggestions = false
				inputElement?.focus()
			}
		} catch (error) {
			if (!disposed) alert(error instanceof Error ? error.message : 'Failed to create tag')
		} finally {
			creating = false
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

	function closeSuggestions() {
		showSuggestions = false
		selectedIndex = -1
		suggestionSearch.clear()
	}
</script>

<div
	class="tag-input-wrapper"
	use:clickOutside={{ enabled: showSuggestions, callback: closeSuggestions }}
>
	{#if label}
		<label class="input-label" for={inputId}>{label}</label>
	{/if}

	<div class="tag-input-container">
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="tag-pills tag-pills-{size}"
			class:has-tags={tags.length > 0}
			onclick={handleContainerClick}
		>
			{#each tags as tag (tag.id)}
				<TagPill {tag} {disabled} onremove={removeTag} />
			{/each}

			<!-- Input -->
			{#if tags.length < maxTags}
				<input
					bind:this={inputElement}
					id={inputId}
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
					aria-controls={`${inputId}-suggestions`}
					aria-activedescendant={selectedIndex >= 0
						? `${inputId}-suggestions-option-${selectedIndex}`
						: undefined}
					aria-label={label || 'Add tags'}
				/>
			{/if}
		</div>

		<TagSuggestions
			{showSuggestions}
			suggestions={filteredSuggestions}
			{isLoadingSuggestions}
			{selectedIndex}
			onselect={addExistingTag}
			listId={`${inputId}-suggestions`}
		/>
	</div>
</div>

<style lang="scss">
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
</style>
