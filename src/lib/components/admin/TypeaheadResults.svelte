<script lang="ts">
	import type { TypeaheadResult } from '$lib/types/garden'
	let {
		showResults,
		results,
		isLoading,
		selectedIndex,
		onselect,
		placeholderAspectRatio,
		emptyText,
		listId
	}: {
		showResults: boolean
		results: TypeaheadResult[]
		isLoading: boolean
		selectedIndex: number
		onselect: (result: TypeaheadResult) => void
		placeholderAspectRatio: string
		emptyText: string
		listId: string
	} = $props()
	let resultElements: HTMLButtonElement[] = $state([])
	$effect(() => {
		if (selectedIndex >= 0) resultElements[selectedIndex]?.scrollIntoView({ block: 'nearest' })
	})
</script>

{#if showResults}
	<div class="typeahead-results" id={listId} role="listbox">
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
					onclick={() => onselect(result)}
					bind:this={resultElements[i]}
					id="{listId}-option-{i}"
					role="option"
					aria-selected={selectedIndex === i}
				>
					{#if result.image}
						<img class="result-thumb" src={result.image} alt="" />
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

<style lang="scss">
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
