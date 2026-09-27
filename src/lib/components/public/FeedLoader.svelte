<script lang="ts">
	import { InfiniteLoader, type LoaderState } from 'svelte-infinite'
	import LoadingSpinner from '$components/admin/LoadingSpinner.svelte'
	let {
		loaderState,
		loadMore,
		lastError,
		noun
	}: { loaderState: LoaderState; loadMore: () => Promise<void>; lastError: string; noun: string } =
		$props()
</script>

<InfiniteLoader
	{loaderState}
	triggerLoad={loadMore}
	intersectionOptions={{ rootMargin: '0px 0px 200px 0px' }}
>
	<!-- Empty content since we're rendering the grid above -->
	<div style="height: 1px;"></div>

	{#snippet loading()}
		<div class="loading-container">
			<LoadingSpinner size="medium" text="Loading more {noun}..." />
		</div>
	{/snippet}

	{#snippet error()}
		<div class="error-retry">
			<p class="error-text">{lastError || `Failed to load ${noun}`}</p>
			<button
				class="retry-button"
				onclick={() => {
					loaderState.reset()
					loadMore()
				}}
			>
				Try again
			</button>
		</div>
	{/snippet}

	{#snippet noData()}
		<div class="end-message">
			<p>You've reached the end</p>
		</div>
	{/snippet}
</InfiniteLoader>

<style lang="scss">
	.loading-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 100px;
		margin-top: $unit-4x;
	}

	.end-message {
		text-align: center;
		padding: $unit-6x 0;

		p {
			margin: 0;
			color: $gray-50;
			font-size: 1rem;
		}
	}

	.error-retry {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: $unit-2x;
		padding: $unit-4x $unit-2x;
		margin-top: $unit-4x;
	}

	.error-text {
		margin: 0;
		color: $red-60;
		font-size: 0.875rem;
		text-align: center;
		max-width: 300px;
	}

	.retry-button {
		padding: $unit $unit-3x;
		background-color: $primary-color;
		color: white;
		border: none;
		border-radius: $unit;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s ease;

		&:hover {
			background-color: color.adjust($primary-color, $lightness: -10%);
		}

		&:active {
			transform: scale(0.98);
		}
	}
</style>
