<script lang="ts">
	import type { TagSuggestion } from '$lib/admin/tag-requests'
	let {
		showSuggestions,
		suggestions,
		isLoadingSuggestions,
		selectedIndex,
		onselect,
		listId
	}: {
		showSuggestions: boolean
		suggestions: TagSuggestion[]
		isLoadingSuggestions: boolean
		selectedIndex: number
		onselect: (tag: TagSuggestion) => void
		listId: string
	} = $props()
</script>

<!-- Suggestions dropdown -->
{#if showSuggestions}
	<div class="tag-suggestions" id={listId} role="listbox">
		{#if isLoadingSuggestions}
			<div class="suggestion-loading">
				<span class="spinner"></span>
				Searching...
			</div>
		{:else if suggestions.length > 0}
			{#each suggestions as tag, i (tag.id)}
				<button
					type="button"
					class="suggestion-item"
					class:selected={selectedIndex === i}
					onclick={() => onselect(tag)}
					id="{listId}-option-{i}"
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

<style lang="scss">
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
