<script lang="ts">
	import type { createAuditController } from '$lib/admin/media/audit-controller.svelte'
	import Button from '../Button.svelte'
	import Modal from '../Modal.svelte'
	import { formatBytes } from '$lib/utils/format'

	let {
		auditData,
		cleaningUp,
		cleanupBrokenReferences,
		deleteSelected,
		deleting,
		selectedFiles,
		selectedSize,
		showCleanupModal = $bindable(),
		showDeleteModal = $bindable()
	}: {
		auditData: ReturnType<typeof createAuditController>['auditData']
		cleaningUp: ReturnType<typeof createAuditController>['cleaningUp']
		cleanupBrokenReferences: ReturnType<typeof createAuditController>['cleanupBrokenReferences']
		deleteSelected: ReturnType<typeof createAuditController>['deleteSelected']
		deleting: ReturnType<typeof createAuditController>['deleting']
		selectedFiles: ReturnType<typeof createAuditController>['selectedFiles']
		selectedSize: ReturnType<typeof createAuditController>['selectedSize']
		showCleanupModal: ReturnType<typeof createAuditController>['showCleanupModal']
		showDeleteModal: ReturnType<typeof createAuditController>['showDeleteModal']
	} = $props()
</script>

<!-- Delete Confirmation Modal -->
<Modal bind:isOpen={showDeleteModal}>
	<div class="audit-modal-content">
		<div class="modal-header">
			<h2>Delete Orphaned Files</h2>
		</div>
		<div class="delete-confirmation">
			<p>Are you sure you want to delete {selectedFiles.size} orphaned files?</p>
			<p class="size-info">This will free up {formatBytes(selectedSize)} of storage.</p>
			<p class="warning">⚠️ This action cannot be undone.</p>
		</div>
		<div class="modal-actions">
			<Button
				variant="secondary"
				onclick={() => {
					showDeleteModal = false
				}}>Cancel</Button
			>
			<Button
				variant="danger"
				onclick={() => {
					deleteSelected(false)
				}}
				disabled={deleting}
			>
				{deleting ? 'Deleting...' : 'Delete Files'}
			</Button>
		</div>
	</div>
</Modal>

<!-- Cleanup Confirmation Modal -->
<Modal bind:isOpen={showCleanupModal}>
	<div class="audit-modal-content">
		<div class="modal-header">
			<h2>Clean Up Broken References</h2>
		</div>
		<div class="cleanup-confirmation">
			<p>
				Are you sure you want to clean up {auditData?.missingReferences.length || 0} broken references?
			</p>
			<p class="warning">⚠️ This will:</p>
			<ul class="cleanup-actions">
				<li>Delete Media records where the main file no longer exists in Cloudinary</li>
				<li>Remove broken thumbnail URLs from Media records</li>
				<li>Remove broken image URLs from Projects and Posts</li>
				<li>Remove broken images from galleries and attachments</li>
			</ul>
			<p class="warning">This action cannot be undone.</p>
		</div>
		<div class="modal-actions">
			<Button
				variant="secondary"
				onclick={() => {
					showCleanupModal = false
				}}>Cancel</Button
			>
			<Button
				variant="danger"
				onclick={() => {
					cleanupBrokenReferences()
				}}
				disabled={cleaningUp}
			>
				{cleaningUp ? 'Cleaning Up...' : 'Clean Up References'}
			</Button>
		</div>
	</div>
</Modal>

<style lang="scss">
	.delete-confirmation {
		padding: 1rem 0;

		p {
			margin: 0.5rem 0;
		}

		.size-info {
			color: $gray-30;
			font-size: 0.875rem;
		}

		.warning {
			color: $yellow-60;
			font-weight: 500;
			margin-top: 1rem;
		}
	}
	.cleanup-confirmation {
		padding: 1rem 0;

		p {
			margin: 0.5rem 0;
		}

		.warning {
			color: $yellow-60;
			font-weight: 500;
			margin: 1rem 0;
		}

		.cleanup-actions {
			margin: 0.75rem 0 0.75rem 1.5rem;
			padding: 0;
			list-style-type: disc;
			color: $gray-30;
			font-size: 0.875rem;

			li {
				margin: 0.25rem 0;
			}
		}
	}
	.modal-header {
		margin-bottom: 1rem;

		h2 {
			margin: 0;
			font-size: 1.25rem;
			font-weight: 600;
			color: $gray-10;
		}
	}
	.audit-modal-content {
		display: flex;
		flex-direction: column;
		padding: 1.5rem;
		min-width: 400px;
	}
	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid $gray-90;
	}
</style>
