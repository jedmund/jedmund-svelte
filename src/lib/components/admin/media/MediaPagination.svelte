<script lang="ts">
	let {
		currentPage,
		totalPages,
		onPage
	}: { currentPage: number; totalPages: number; onPage: (page: number) => void } = $props()
</script>

{#if totalPages > 1}
	<div class="pagination">
		<button
			onclick={() => onPage(currentPage - 1)}
			disabled={currentPage === 1}
			class="pagination-btn"
		>
			Previous
		</button>
		<span class="pagination-info">
			Page {currentPage} of {totalPages}
		</span>
		<button
			onclick={() => onPage(currentPage + 1)}
			disabled={currentPage === totalPages}
			class="pagination-btn"
		>
			Next
		</button>
	</div>
{/if}

<style lang="scss">
	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: $unit-3x;
		margin-top: $unit-4x;

		.pagination-btn {
			padding: $unit $unit-3x;
			background: $gray-95;
			border: none;
			border-radius: 50px;
			color: $gray-20;
			font-size: 0.875rem;
			cursor: pointer;
			transition: all 0.2s ease;

			&:hover:not(:disabled) {
				background: $gray-90;
				color: $gray-10;
			}

			&:disabled {
				opacity: 0.5;
				cursor: not-allowed;
			}
		}

		.pagination-info {
			font-size: 0.875rem;
			color: $gray-40;
		}
	}
</style>
