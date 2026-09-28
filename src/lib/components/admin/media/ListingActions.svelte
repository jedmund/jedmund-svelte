<script lang="ts">
	let {
		total,
		selectedCount,
		busy,
		onSelectAll,
		onClear,
		onMark,
		onUnmark,
		onDelete,
		onAlbums
	}: {
		total: number
		selectedCount: number
		busy: boolean
		onSelectAll: () => void
		onClear: () => void
		onMark: () => void
		onUnmark: () => void
		onDelete: () => void
		onAlbums: () => void
	} = $props()
</script>

<div class="bulk-actions">
	<div class="bulk-actions-left">
		<button
			type="button"
			onclick={onSelectAll}
			class="btn btn-secondary btn-small"
			disabled={selectedCount === total}
		>
			Select All ({total})
		</button>
		<button
			type="button"
			onclick={onClear}
			class="btn btn-secondary btn-small"
			disabled={selectedCount === 0}
		>
			Clear Selection
		</button>
	</div>
	<div class="bulk-actions-right">
		{#if selectedCount > 0}
			<button
				type="button"
				onclick={onMark}
				class="btn btn-secondary btn-small"
				title="Mark selected items as photography"
			>
				Mark Photography
			</button>
			<button
				type="button"
				onclick={onUnmark}
				class="btn btn-secondary btn-small"
				title="Remove photography status from selected items"
			>
				Remove Photography
			</button>
			<button
				type="button"
				onclick={onAlbums}
				class="btn btn-secondary btn-small"
				title="Add or remove selected items from albums"
			>
				Manage Albums
			</button>
			<button type="button" onclick={onDelete} class="btn btn-danger btn-small" disabled={busy}>
				{busy ? 'Deleting...' : `Delete ${selectedCount} file${selectedCount > 1 ? 's' : ''}`}
			</button>
		{/if}
	</div>
</div>

<style lang="scss">
	.btn {
		padding: $unit-2x $unit-3x;
		border-radius: 50px;
		text-decoration: none;
		font-size: 0.925rem;
		transition: all 0.2s ease;
		border: none;
		cursor: pointer;

		&.btn-secondary {
			background-color: $gray-95;
			color: $gray-20;

			&:hover {
				background-color: $gray-90;
				color: $gray-10;
			}
		}
	}
	.bulk-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: $unit-2x $unit-3x;
		background: $gray-95;
		border-radius: $unit;
		margin-bottom: $unit-3x;
		gap: $unit-2x;

		.bulk-actions-left,
		.bulk-actions-right {
			display: flex;
			gap: $unit;
		}

		.btn-small {
			padding: $unit $unit-2x;
			font-size: 0.8rem;
		}

		.btn-danger {
			background-color: $red-60;
			color: white;

			&:hover:not(:disabled) {
				background-color: $red-50;
			}

			&:disabled {
				opacity: 0.6;
				cursor: not-allowed;
			}
		}
	}
</style>
