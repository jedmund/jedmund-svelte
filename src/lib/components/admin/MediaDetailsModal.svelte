<script lang="ts">
	import { untrack } from 'svelte'
	import { createDetailsSession, emptyDetails } from '$lib/admin/media/details-session'
	import DetailsPreview from './media/DetailsPreview.svelte'
	import DetailsFields from './media/DetailsFields.svelte'

	import Modal from './Modal.svelte'
	import Button from './Button.svelte'
	import AlbumSelector from './AlbumSelector.svelte'
	import CloseButton from '$components/icons/CloseButton.svelte'
	import CopyIcon from '$components/icons/CopyIcon.svelte'
	import MediaMetadataPanel from './MediaMetadataPanel.svelte'
	import { toast } from '$lib/stores/toast'
	import type { Media } from '@prisma/client'

	interface Props {
		isOpen: boolean
		media: Media | null
		onClose: () => void
		onUpdate: (updatedMedia: Media) => void | Promise<void>
	}

	let { isOpen = $bindable(), media, onClose, onUpdate }: Props = $props()

	let description = $state('')
	let isPhotography = $state(false)
	let details = $state.raw(emptyDetails())
	let showAlbumSelector = $state(false)
	const session = createDetailsSession({
		onChange: (value) => (details = value),
		onSaved: (updated) => onUpdate(updated),
		onClose: handleClose,
		getDraft: () => ({ description, isPhotography })
	})
	const mediaId = $derived(media?.id)
	$effect(() => {
		const id = mediaId
		if (!isOpen || id === undefined) return
		untrack(() => {
			if (!media) return
			description = media.description || ''
			isPhotography = media.isPhotography || false
			showAlbumSelector = false
			session.select(media)
		})
		return session.close
	})
	function handleClose() {
		session.close()
		showAlbumSelector = false
		isOpen = false
		onClose()
	}
	async function handleSave() {
		const toastId = toast.loading('Saving changes...')
		try {
			if (await session.save({ description, isPhotography }))
				toast.success('Media updated successfully!')
		} catch {
			toast.error('Failed to update media. Please try again.')
		} finally {
			toast.dismiss(toastId)
		}
	}
	async function handleDelete() {
		if (!confirm('Are you sure you want to delete this media file? This action cannot be undone.'))
			return
		const toastId = toast.loading('Deleting media...')
		try {
			if (await session.delete()) toast.success('Media deleted successfully')
		} catch {
			toast.error('Failed to delete media. Please try again.')
		} finally {
			toast.dismiss(toastId)
		}
	}

	function copyUrl() {
		if (media?.url) {
			navigator.clipboard
				.writeText(media.url)
				.then(() => {
					toast.success('URL copied to clipboard!')
				})
				.catch(() => {
					toast.error('Failed to copy URL')
				})
		}
	}
</script>

{#if media}
	<Modal
		bind:isOpen
		size="jumbo"
		closeOnBackdrop={!details.saving}
		closeOnEscape={!details.saving}
		onClose={handleClose}
		showCloseButton={false}
	>
		<div class="media-details-modal">
			<!-- Left Pane - Media Preview -->
			<DetailsPreview {media} />

			<!-- Right Pane - Details -->
			<div class="details-pane">
				<!-- Header -->
				<div class="pane-header">
					<h2 class="filename-header">{media.filename}</h2>
					<div class="header-actions">
						{#if !details.saving}
							<Button variant="ghost" onclick={copyUrl} iconOnly aria-label="Copy URL">
								{#snippet icon()}<CopyIcon size={20} />{/snippet}
							</Button>
							<Button variant="ghost" onclick={handleClose} iconOnly aria-label="Close modal">
								{#snippet icon()}<CloseButton />{/snippet}
							</Button>
						{/if}
					</div>
				</div>
				<div class="pane-body">
					<!-- Media Metadata Panel -->
					<MediaMetadataPanel {media} heartCount={details.heartCount} showExifToggle={true} />

					<DetailsFields
						{media}
						bind:description
						bind:isPhotography
						isSaving={details.saving}
						usage={details.usage}
						loadingUsage={details.loadingUsage}
						albums={details.albums}
						onAlbums={() => (showAlbumSelector = true)}
					/>

					<!-- Footer -->
					<div class="pane-footer">
						<div class="footer-left">
							<Button
								variant="ghost"
								onclick={handleDelete}
								disabled={details.saving}
								class="delete-button"
							>
								Delete
							</Button>
						</div>

						<div class="footer-right">
							<Button variant="primary" onclick={handleSave} disabled={details.saving}
								>Save Changes</Button
							>
						</div>
					</div>
				</div>
			</div>
		</div></Modal
	>

	<!-- Album Selector Modal -->
	{#if showAlbumSelector && media}
		<Modal isOpen={showAlbumSelector} onClose={() => (showAlbumSelector = false)} size="medium">
			<AlbumSelector
				mediaId={media.id}
				currentAlbums={details.albums}
				onUpdate={(updatedAlbums) => {
					session.setAlbums(updatedAlbums)
					showAlbumSelector = false
				}}
				onClose={() => (showAlbumSelector = false)}
			/>
		</Modal>
	{/if}
{/if}

<style lang="scss">
	.media-details-modal {
		display: flex;
		height: 100%;
		overflow: hidden;
	}

	// Left pane - Image preview

	// Right pane - Details
	.details-pane {
		width: 400px;
		background-color: white;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.pane-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: $unit-2x $unit-3x;
		border-bottom: $unit-1px solid rgba(0, 0, 0, 0.08);
		flex-shrink: 0;
		gap: $unit-2x;

		.filename-header {
			flex: 1;
			font-size: 1.125rem;
			font-weight: 500;
			margin: 0;
			color: $gray-10;
			word-break: break-all;
			line-height: 1.5;
		}

		.header-actions {
			display: flex;
			align-items: center;
			gap: $unit;
		}
	}

	.pane-body {
		flex: 1;
		overflow-y: auto;
	}

	// Albums inline display

	.pane-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: $unit-2x $unit-3x;
		border-top: $unit-1px solid rgba(0, 0, 0, 0.08);
		flex-shrink: 0;

		.footer-left {
			:global(.delete-button) {
				color: $red-60;

				&:hover {
					background-color: rgba(239, 68, 68, 0.1);
				}
			}
		}

		.footer-right {
			display: flex;
			align-items: center;
			gap: $unit-2x;
		}
	}

	// Responsive adjustments
	@media (max-width: 768px) {
		.media-details-modal {
			flex-direction: column;
		}

		.details-pane {
			width: 100%;
			flex: 1;
		}

		.pane-header {
			padding: $unit-3x;
		}

		.pane-footer {
			padding: $unit-3x;
			flex-direction: column;
			gap: $unit-3x;
			align-items: stretch;

			.footer-right {
				justify-content: space-between;
			}
		}
	}
</style>
