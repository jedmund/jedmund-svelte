<script lang="ts">
	import Modal from './Modal.svelte'
	import AlbumSelector from './AlbumSelector.svelte'
	import Button from './Button.svelte'
	import LoadingSpinner from './LoadingSpinner.svelte'
	import type { Album } from '@prisma/client'

	interface Props {
		isOpen: boolean
		selectedMediaIds: number[]
		onClose?: () => void
		onSave?: () => void
	}

	let { isOpen = $bindable(), selectedMediaIds = [], onClose, onSave }: Props = $props()

	// State
	let selectedAlbumId = $state<number | null>(null)
	let isSaving = $state(false)
	let error = $state('')

	// Reset state when modal opens
	$effect(() => {
		if (isOpen) {
			selectedAlbumId = null
			error = ''
		}
	})

	async function handleSave() {
		if (!selectedAlbumId || selectedMediaIds.length === 0) return

		try {
			isSaving = true
			error = ''
			const auth = localStorage.getItem('admin_auth')
			if (!auth) return

			const response = await fetch(`/api/albums/${selectedAlbumId}/media`, {
				method: 'POST',
				headers: {
					Authorization: `Basic ${auth}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ mediaIds: selectedMediaIds })
			})

			if (!response.ok) {
				throw new Error('Failed to add media to album')
			}

			handleClose()
			onSave?.()
		} catch (err) {
			console.error('Failed to update album:', err)
			error = err instanceof Error ? err.message : 'Failed to update album'
		} finally {
			isSaving = false
		}
	}

	function handleClose() {
		selectedAlbumId = null
		error = ''
		isOpen = false
		onClose?.()
	}

	function handleCancel() {
		handleClose()
	}

	function handleAlbumSelect(albumId: number | null) {
		selectedAlbumId = albumId
	}

	// Computed
	const canSave = $derived(selectedAlbumId !== null && selectedMediaIds.length > 0)
	const mediaCount = $derived(selectedMediaIds.length)
</script>

<Modal bind:isOpen onClose={handleClose} size="medium" showCloseButton={false}>
	<div class="album-selector-modal">
		<!-- Header -->
		<div class="modal-header">
			<div class="header-top">
				<h2>Add to Album</h2>
				<button class="close-button" onclick={handleClose} aria-label="Close modal">
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M6 6L18 18M6 18L18 6"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
						/>
					</svg>
				</button>
			</div>
			<p class="modal-subtitle">
				Select an album to add {mediaCount}
				{mediaCount === 1 ? 'item' : 'items'} to
			</p>

			{#if error}
				<div class="error-message">{error}</div>
			{/if}
		</div>

		<!-- Album Selector -->
		<div class="modal-body">
			<AlbumSelector {selectedAlbumId} onSelect={handleAlbumSelect} placeholder="Choose an album" />
		</div>

		<!-- Footer -->
		<div class="modal-footer">
			<div class="action-summary">
				{#if selectedAlbumId}
					<span>Ready to add {mediaCount} {mediaCount === 1 ? 'item' : 'items'}</span>
				{:else}
					<span>Select an album to continue</span>
				{/if}
			</div>
			<div class="action-buttons">
				<Button variant="ghost" onclick={handleCancel}>Cancel</Button>
				<Button variant="primary" onclick={handleSave} disabled={!canSave || isSaving}>
					{#if isSaving}
						<LoadingSpinner buttonSize="small" />
						Adding...
					{:else}
						Add to Album
					{/if}
				</Button>
			</div>
		</div>
	</div>
</Modal>

<style lang="scss">
	.album-selector-modal {
		display: flex;
		flex-direction: column;
		min-height: 300px;
		position: relative;
		padding: 0;
	}

	.modal-header {
		display: flex;
		flex-direction: column;
		gap: $unit;
		padding: $unit-3x;
		border-bottom: 1px solid $gray-90;

		h2 {
			margin: 0;
			font-size: 1.5rem;
			font-weight: 600;
			color: $gray-10;
		}
	}

	.header-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.modal-subtitle {
		margin: 0;
		font-size: 0.875rem;
		color: $gray-40;
	}

	.close-button {
		width: 32px;
		height: 32px;
		border: none;
		background: none;
		color: $gray-40;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		transition: all 0.2s ease;
		padding: 0;

		&:hover {
			background: $gray-90;
			color: $gray-10;
		}

		svg {
			flex-shrink: 0;
		}
	}

	.error-message {
		background: rgba(239, 68, 68, 0.1);
		color: #dc2626;
		padding: $unit-2x;
		border-radius: $unit;
		border: 1px solid rgba(239, 68, 68, 0.2);
		margin-top: $unit-2x;
	}

	.modal-body {
		flex: 1;
		padding: $unit-3x;
		display: flex;
		flex-direction: column;
		min-height: 150px;
	}

	.modal-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: $unit-3x;
		padding: $unit-3x;
		border-top: 1px solid $gray-90;
		background: $gray-95;
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
