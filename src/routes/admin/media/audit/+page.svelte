<script lang="ts">
	import AuditConfirmations from '$lib/components/admin/media/AuditConfirmations.svelte'
	import AuditReferences from '$lib/components/admin/media/AuditReferences.svelte'
	import AuditOrphans from '$lib/components/admin/media/AuditOrphans.svelte'
	import AuditSummary from '$lib/components/admin/media/AuditSummary.svelte'
	import { goto } from '$app/navigation'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import Button from '$lib/components/admin/Button.svelte'
	import { AlertCircle, RefreshCw } from '@lucide/svelte'
	import ChevronLeft from '$icons/chevron-left.svg?component'

	import { createAuditController } from '$lib/admin/media/audit-controller.svelte'
	const maintenance = createAuditController()
</script>

<svelte:head>
	<title>Media Audit - Admin @jedmund</title>
</svelte:head>

<AdminPage>
	{#snippet header()}
		<header>
			<div class="header-left">
				<button class="btn-icon" onclick={() => goto('/admin/media')}>
					<ChevronLeft />
				</button>
				<h1>Cloudinary Audit</h1>
			</div>
			<div class="header-actions">
				<Button
					variant="secondary"
					onclick={() => maintenance.runAudit()}
					disabled={maintenance.loading}
					iconPosition="left"
				>
					{#snippet icon()}<RefreshCw size={18} />{/snippet}
					{maintenance.loading ? 'Running Audit...' : 'Run Audit'}
				</Button>
			</div>
		</header>
	{/snippet}

	{#if maintenance.loading}
		<div class="loading">
			<div class="spinner"></div>
			<p>Analyzing Cloudinary storage...</p>
		</div>
	{:else if maintenance.error}
		<div class="error">
			<AlertCircle size={24} />
			<p>{maintenance.error}</p>
			<Button variant="secondary" size="small" onclick={() => maintenance.runAudit()}
				>Try Again</Button
			>
		</div>
	{:else if maintenance.auditData}
		<!-- Summary Cards -->
		<AuditSummary auditData={maintenance.auditData} />

		<AuditOrphans
			allSelected={maintenance.allSelected}
			auditData={maintenance.auditData}
			deleting={maintenance.deleting}
			hasSelection={maintenance.hasSelection}
			selectedFiles={maintenance.selectedFiles}
			selectedSize={maintenance.selectedSize}
			bind:showDeleteModal={maintenance.showDeleteModal}
			toggleFile={maintenance.toggleFile}
			toggleSelectAll={maintenance.toggleSelectAll}
		/>

		{#if maintenance.deleteResults}
			<div class="delete-results">
				<h3>Deletion Complete</h3>
				<p>✓ Successfully deleted {maintenance.deleteResults.succeeded} files</p>
				{#if maintenance.deleteResults.failed.length > 0}
					<p>✗ Failed to delete {maintenance.deleteResults.failed.length} files</p>
				{/if}
			</div>
		{/if}

		<AuditReferences
			auditData={maintenance.auditData}
			cleaningUp={maintenance.cleaningUp}
			cleanupResults={maintenance.cleanupResults}
			bind:showCleanupModal={maintenance.showCleanupModal}
		/>
	{/if}
</AdminPage>

<AuditConfirmations
	auditData={maintenance.auditData}
	cleaningUp={maintenance.cleaningUp}
	cleanupBrokenReferences={maintenance.cleanupBrokenReferences}
	deleteSelected={maintenance.deleteSelected}
	deleting={maintenance.deleting}
	selectedFiles={maintenance.selectedFiles}
	selectedSize={maintenance.selectedSize}
	bind:showCleanupModal={maintenance.showCleanupModal}
	bind:showDeleteModal={maintenance.showDeleteModal}
/>

<style lang="scss">
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0;
		margin: 0;
		width: 100%;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: $unit-2x;

		h1 {
			margin: 0;
			font-size: 1.5rem;
			font-weight: 600;
			color: $gray-10;
		}
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: $unit-2x;
	}

	.btn-icon {
		width: 40px;
		height: 40px;
		border: none;
		background: none;
		color: $gray-40;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		transition: all 0.2s ease;

		:global(svg) {
			width: 20px;
			height: 20px;
			fill: none;
			stroke: currentColor;
			stroke-width: 2;
			stroke-linecap: round;
			stroke-linejoin: round;
		}

		&:hover {
			background: $gray-90;
			color: $gray-10;
		}
	}

	.loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 400px;
		gap: 1rem;

		.spinner {
			width: 40px;
			height: 40px;
			border: 3px solid $gray-80;
			border-top-color: $red-60;
			border-radius: 50%;
			animation: spin 1s linear infinite;
		}

		p {
			color: $gray-30;
		}
	}

	.error {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 400px;
		gap: 1rem;
		color: $red-60;

		p {
			font-size: 1.1rem;
		}
	}

	.delete-results {
		margin-top: 1rem;
		padding: 1rem;
		background: rgba($blue-60, 0.1);
		border-radius: 8px;
		text-align: center;

		h3 {
			margin: 0 0 0.5rem;
			color: $blue-60;
		}

		p {
			margin: 0.25rem 0;
			color: $gray-30;
		}
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
