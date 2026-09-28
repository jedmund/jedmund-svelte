<script lang="ts">
	import OrphanFilesTable from './OrphanFilesTable.svelte'
	import type { createAuditController } from '$lib/admin/media/audit-controller.svelte'
	import Button from '../Button.svelte'
	import { formatBytes } from '$lib/utils/format'
	import { CheckCircle } from '@lucide/svelte'
	import { Trash2 } from '@lucide/svelte'

	let {
		allSelected,
		auditData,
		deleting,
		hasSelection,
		selectedFiles,
		selectedSize,
		showDeleteModal = $bindable(),
		toggleFile,
		toggleSelectAll
	}: {
		allSelected: ReturnType<typeof createAuditController>['allSelected']
		auditData: NonNullable<ReturnType<typeof createAuditController>['auditData']>
		deleting: ReturnType<typeof createAuditController>['deleting']
		hasSelection: ReturnType<typeof createAuditController>['hasSelection']
		selectedFiles: ReturnType<typeof createAuditController>['selectedFiles']
		selectedSize: ReturnType<typeof createAuditController>['selectedSize']
		showDeleteModal: ReturnType<typeof createAuditController>['showDeleteModal']
		toggleFile: ReturnType<typeof createAuditController>['toggleFile']
		toggleSelectAll: ReturnType<typeof createAuditController>['toggleSelectAll']
	} = $props()
</script>

{#if auditData.orphanedFiles.length > 0}
	<!-- Actions Bar -->
	<div class="actions-bar">
		<div class="selection-info">
			{#if hasSelection}
				<span>{selectedFiles.size} files selected ({formatBytes(selectedSize)})</span>
			{:else}
				<span>{auditData.orphanedFiles.length} orphaned files found</span>
			{/if}
			{#if auditData.orphanedFiles.length > 20}
				<span class="limit-notice">(Max 20 at once)</span>
			{/if}
		</div>
		<div class="actions">
			<Button variant="text" buttonSize="small" onclick={toggleSelectAll}>
				{allSelected ? 'Deselect All' : 'Select 20'}
			</Button>
			<Button
				variant="danger"
				buttonSize="small"
				onclick={() => {
					showDeleteModal = true
				}}
				disabled={!hasSelection || deleting}
				iconPosition="left"
			>
				{#snippet icon()}<Trash2 size={18} />{/snippet}
				Delete Selected
			</Button>
		</div>
	</div>

	<!-- Files Table -->
	<OrphanFilesTable {auditData} {selectedFiles} {allSelected} {toggleSelectAll} {toggleFile} />
{:else}
	<!-- No orphaned files -->
	<div class="empty-state">
		<CheckCircle size={48} />
		<h2>All Clean!</h2>
		<p>No orphaned files found. Your Cloudinary storage is in sync with your database.</p>
	</div>
{/if}

<style lang="scss">
	.actions-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: $gray-95;
		border-radius: 8px;
		margin-bottom: 1rem;

		.selection-info {
			color: $gray-30;
			font-size: 0.875rem;
			display: flex;
			align-items: center;
			gap: 0.5rem;

			.limit-notice {
				color: $yellow-60;
				font-size: 0.8125rem;
			}
		}

		.actions {
			display: flex;
			gap: 0.5rem;
		}
	}
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 400px;
		text-align: center;
		color: $blue-60;

		h2 {
			margin: 1rem 0 0.5rem;
			color: $gray-10;
		}

		p {
			color: $gray-30;
			max-width: 400px;
		}
	}
</style>
