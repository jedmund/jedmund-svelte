<script lang="ts">
	import type { createAuditController } from '$lib/admin/media/audit-controller.svelte'

	let {
		auditData
	}: {
		auditData: NonNullable<ReturnType<typeof createAuditController>['auditData']>
	} = $props()
</script>

<div class="summary-grid">
	<div class="summary-card">
		<div class="card-content">
			<h3>Total Files</h3>
			<p class="value">{auditData.summary.totalCloudinaryFiles.toLocaleString()}</p>
			<p class="label">in Cloudinary</p>
		</div>
	</div>
	<div class="summary-card">
		<div class="card-content">
			<h3>Database References</h3>
			<p class="value">
				{auditData.summary.totalDatabaseReferences.toLocaleString()}
			</p>
			<p class="label">tracked files</p>
		</div>
	</div>
	<div class="summary-card warning">
		<div class="card-content">
			<h3>Orphaned Files</h3>
			<p class="value">{auditData.summary.orphanedFilesCount.toLocaleString()}</p>
			<p class="label">{auditData.summary.orphanedFilesSizeFormatted} wasted</p>
		</div>
	</div>
	<div class="summary-card {auditData.summary.missingReferencesCount > 0 ? 'error' : ''}">
		<div class="card-content">
			<h3>Missing Files</h3>
			<p class="value">
				{auditData.summary.missingReferencesCount.toLocaleString()}
			</p>
			<p class="label">broken references</p>
		</div>
	</div>
</div>

<style lang="scss">
	.summary-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1.5rem;
		margin-bottom: 2rem;

		@media (max-width: 768px) {
			grid-template-columns: 1fr;
		}
	}
	.summary-card {
		background: $gray-95;
		border-radius: 8px;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 140px;

		.card-content {
			padding: 1.5rem;
			text-align: center;
			width: 100%;
		}

		h3 {
			font-size: 0.875rem;
			font-weight: 500;
			color: $gray-30;
			margin: 0 0 0.75rem 0;
			letter-spacing: 0.01em;
			text-transform: uppercase;
		}

		.value {
			font-size: 2.5rem;
			font-weight: 600;
			color: $gray-10;
			margin: 0 0 0.5rem 0;
			line-height: 1;
			display: block;
		}

		.label {
			font-size: 0.875rem;
			color: $gray-40;
			margin: 0;
			line-height: 1.2;
			display: block;
		}

		&.warning {
			background: rgba($yellow-60, 0.1);

			.value {
				color: $yellow-60;
			}
		}

		&.error {
			background: rgba($red-60, 0.1);

			.value {
				color: $red-60;
			}
		}
	}
</style>
