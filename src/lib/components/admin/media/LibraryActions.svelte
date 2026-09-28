<script lang="ts">
	import Button from '../Button.svelte'
	import LoadingSpinner from '../LoadingSpinner.svelte'
	let {
		summary,
		canConfirm,
		isSaving,
		showInAlbumMode,
		confirmText,
		onClose,
		onConfirm
	}: {
		summary: string
		canConfirm: boolean
		isSaving: boolean
		showInAlbumMode: boolean
		confirmText: string
		onClose: () => void
		onConfirm: () => void
	} = $props()
</script>

<div class="modal-footer">
	<div class="action-summary">
		<span>{summary}</span>
	</div>
	<div class="action-buttons">
		<Button variant="ghost" onclick={onClose}>Cancel</Button>
		<Button variant="primary" onclick={onConfirm} disabled={!canConfirm || isSaving}>
			{#if isSaving}
				<LoadingSpinner size="small" />
				{showInAlbumMode ? 'Updating...' : 'Selecting...'}
			{:else}
				{confirmText}
			{/if}
		</Button>
	</div>
</div>

<style lang="scss">
	.modal-footer {
		position: sticky;
		bottom: 0;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: $unit-3x;
		padding: $unit-3x $unit-4x $unit-4x;
		border-top: 1px solid $gray-85;
		background: white;
		z-index: $z-index-dropdown;
		box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
	}
	.action-summary {
		font-size: 0.875rem;
		color: $gray-30;
		flex: 1;
	}
	.action-buttons {
		display: flex;
		gap: $unit-2x;
	}
</style>
