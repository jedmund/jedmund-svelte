<script lang="ts">
	import LoaderIcon from '$icons/loader.svg?component'
	let {
		searchQuery = $bindable(),
		storefront = $bindable(),
		isSearching,
		onSearch
	}: {
		searchQuery: string
		storefront: string
		isSearching: boolean
		onSearch: () => void
	} = $props()
	const storefronts = [
		{ value: 'us', label: 'United States' },
		{ value: 'jp', label: 'Japan' },
		{ value: 'gb', label: 'United Kingdom' },
		{ value: 'ca', label: 'Canada' },
		{ value: 'au', label: 'Australia' },
		{ value: 'de', label: 'Germany' },
		{ value: 'fr', label: 'France' },
		{ value: 'es', label: 'Spain' },
		{ value: 'it', label: 'Italy' },
		{ value: 'kr', label: 'South Korea' },
		{ value: 'cn', label: 'China' },
		{ value: 'br', label: 'Brazil' }
	]
</script>

<form
	class="search-controls"
	onsubmit={(event) => {
		event.preventDefault()
		onSearch()
	}}
>
	<div class="control-group">
		<label for="search-query">Search Query</label>
		<input
			id="search-query"
			type="text"
			bind:value={searchQuery}
			placeholder="e.g., Taylor Swift folklore"
			disabled={isSearching}
		/>
	</div>

	<div class="control-group">
		<label for="storefront">Storefront</label>
		<select id="storefront" bind:value={storefront} disabled={isSearching}>
			{#each storefronts as store}
				<option value={store.value}>{store.label}</option>
			{/each}
		</select>
	</div>

	<button class="search-btn" type="submit" disabled={isSearching || !searchQuery.trim()}>
		{#if isSearching}
			<LoaderIcon class="icon spinning" /> Searching...
		{:else}
			Search
		{/if}
	</button>
</form>

<style lang="scss">
	.search-controls {
		flex-wrap: wrap;
		display: flex;
		gap: $unit * 2;
		margin-bottom: $unit * 2;
		align-items: flex-end;

		.control-group {
			min-width: 130px;
			flex: 1;

			label {
				display: block;
				color: rgba(255, 255, 255, 0.8);
				font-size: 12px;
				font-weight: 500;
				margin-bottom: $unit-half;
			}

			input,
			select {
				width: 100%;
				box-sizing: border-box;
				background: rgba(255, 255, 255, 0.1);
				border: 1px solid rgba(255, 255, 255, 0.2);
				color: white;
				padding: $unit;
				border-radius: 4px;
				font-size: 14px;
				font-family: inherit;

				&::placeholder {
					color: rgba(255, 255, 255, 0.4);
				}

				&:focus {
					outline: none;
					border-color: $primary-color;
					background: rgba(255, 255, 255, 0.15);
				}

				&:disabled {
					opacity: 0.5;
					cursor: not-allowed;
				}
			}
		}

		.search-btn {
			padding: $unit $unit * 2;
			background: $primary-color;
			border: none;
			color: white;
			border-radius: 4px;
			font-size: 14px;
			font-weight: 500;
			cursor: pointer;
			transition: all 0.2s;
			display: flex;
			align-items: center;
			gap: $unit-half;
			white-space: nowrap;

			&:hover:not(:disabled) {
				background: color.adjust($primary-color, $lightness: -10%);
			}

			&:disabled {
				opacity: 0.5;
				cursor: not-allowed;
			}

			:global(.icon) {
				width: 16px;
				height: 16px;
			}
		}
	}
	:global(.spinning) {
		animation: spin 1s linear infinite;
	}
	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>
