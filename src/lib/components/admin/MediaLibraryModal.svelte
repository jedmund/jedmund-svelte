<script lang="ts">
	import Modal from './Modal.svelte'
	import Button from './Button.svelte'
	import MediaSelector from './MediaSelector.svelte'
	import type { Media } from '@prisma/client'

	interface Props {
		isOpen: boolean
		mode: 'single' | 'multiple'
		fileType?: 'image' | 'video' | 'all'
		selectedIds?: number[]
		title?: string
		confirmText?: string
		onSelect: (media: Media | Media[]) => void
		onClose: () => void
	}

	let {
		isOpen = $bindable(),
		mode,
		fileType = 'all',
		selectedIds = [],
		title = mode === 'single' ? 'Select Media' : 'Select Media Files',
		confirmText = mode === 'single' ? 'Select' : 'Select Files',
		onSelect,
		onClose
	}: Props = $props()

	let selectedMedia = $state<Media[]>([])
	let isLoading = $state(false)

	function handleMediaSelect(media: Media[]) {
		selectedMedia = media
	}

	function handleConfirm() {
		if (selectedMedia.length === 0) return

		if (mode === 'single') {
			onSelect(selectedMedia[0])
		} else {
			onSelect(selectedMedia)
		}
		
		handleClose()
	}

	function handleClose() {
		selectedMedia = []
		isOpen = false
		onClose()
	}

	function handleCancel() {
		handleClose()
	}

	// Computed properties
	const canConfirm = $derived(selectedMedia.length > 0)
	const selectionCount = $derived(selectedMedia.length)
	const footerText = $derived(
		mode === 'single' 
			? canConfirm ? '1 item selected' : 'No item selected'
			: `${selectionCount} item${selectionCount !== 1 ? 's' : ''} selected`
	)
</script>

<Modal {isOpen} size="full" closeOnBackdrop={false} showCloseButton={false} on:close={handleClose}>
	<div class="media-library-modal">
		<!-- Header -->
		<header class="modal-header">
			<div class="header-content">
				<h2 class="modal-title">{title}</h2>
				<p class="modal-subtitle">
					{#if fileType === 'image'}
						Browse and select image files
					{:else if fileType === 'video'}
						Browse and select video files
					{:else}
						Browse and select media files
					{/if}
				</p>
			</div>
			<Button variant="ghost" iconOnly onclick={handleClose} aria-label="Close modal">
				<svg
					slot="icon"
					width="24"
					height="24"
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
			</Button>
		</header>

		<!-- Media Browser -->
		<div class="modal-body">
			<MediaSelector
				{mode}
				{fileType}
				{selectedIds}
				on:select={(e) => handleMediaSelect(e.detail)}
				bind:loading={isLoading}
			/>
		</div>

		<!-- Footer -->
		<footer class="modal-footer">
			<div class="footer-info">
				<span class="selection-count">{footerText}</span>
			</div>
			<div class="footer-actions">
				<Button variant="ghost" onclick={handleCancel} disabled={isLoading}>
					Cancel
				</Button>
				<Button 
					variant="primary" 
					onclick={handleConfirm} 
					disabled={!canConfirm || isLoading}
				>
					{confirmText}
				</Button>
			</div>
		</footer>
	</div>
</Modal>

<style lang="scss">
	.media-library-modal {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 80vh;
		max-height: 90vh;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: $unit-3x $unit-4x;
		border-bottom: 1px solid $grey-80;
		background-color: white;
		flex-shrink: 0;
	}

	.header-content {
		flex: 1;
	}

	.modal-title {
		font-size: 1.5rem;
		font-weight: 600;
		margin: 0 0 $unit-half 0;
		color: $grey-10;
	}

	.modal-subtitle {
		font-size: 0.875rem;
		color: $grey-30;
		margin: 0;
	}

	.modal-body {
		flex: 1;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.modal-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: $unit-3x $unit-4x;
		border-top: 1px solid $grey-80;
		background-color: $grey-95;
		flex-shrink: 0;
	}

	.footer-info {
		flex: 1;
	}

	.selection-count {
		font-size: 0.875rem;
		color: $grey-30;
		font-weight: 500;
	}

	.footer-actions {
		display: flex;
		gap: $unit-2x;
		align-items: center;
	}

	// Responsive adjustments
	@media (max-width: 768px) {
		.modal-header {
			padding: $unit-2x $unit-3x;
		}

		.modal-footer {
			padding: $unit-2x $unit-3x;
			flex-direction: column;
			gap: $unit-2x;
			align-items: stretch;
		}

		.footer-info {
			text-align: center;
		}

		.footer-actions {
			justify-content: center;
		}

		.modal-title {
			font-size: 1.25rem;
		}
	}
</style>