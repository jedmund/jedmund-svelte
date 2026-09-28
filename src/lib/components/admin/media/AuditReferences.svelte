<script lang="ts">
	import type { createAuditController } from '$lib/admin/media/audit-controller.svelte'
	import Button from '../Button.svelte'
	import { AlertCircle } from '@lucide/svelte'

	let {
		auditData,
		cleaningUp,
		cleanupResults,
		showCleanupModal = $bindable()
	}: {
		auditData: NonNullable<ReturnType<typeof createAuditController>['auditData']>
		cleaningUp: ReturnType<typeof createAuditController>['cleaningUp']
		cleanupResults: ReturnType<typeof createAuditController>['cleanupResults']
		showCleanupModal: ReturnType<typeof createAuditController>['showCleanupModal']
	} = $props()
</script>

{#if auditData.missingReferences.length > 0}
	<div class="broken-references-section">
		<h2>Broken References</h2>
		<p class="broken-references-info">
			Found {auditData.missingReferences.length} files referenced in the database but missing from Cloudinary.
		</p>
		<Button
			variant="secondary"
			buttonSize="small"
			onclick={() => {
				showCleanupModal = true
			}}
			disabled={cleaningUp}
			iconPosition="left"
		>
			{#snippet icon()}<AlertCircle size={18} />{/snippet}
			Clean Up Broken References
		</Button>

		{#if cleanupResults}
			<div class="cleanup-results">
				<h3>Cleanup Complete</h3>
				<p>✓ Cleaned {cleanupResults.cleanedMedia} media records</p>
				<p>✓ Cleaned {cleanupResults.cleanedProjects} project records</p>
				<p>✓ Cleaned {cleanupResults.cleanedPosts} post records</p>
				{#if cleanupResults.errors.length > 0}
					<p>✗ Errors: {cleanupResults.errors.join(', ')}</p>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style lang="scss">
	.broken-references-section {
		margin-top: 2rem;
		padding: 1.5rem;
		background: $gray-95;
		border-radius: 8px;
		border: 1px solid rgba($yellow-60, 0.2);

		h2 {
			margin: 0 0 0.5rem;
			font-size: 1.25rem;
			color: $gray-10;
		}

		.broken-references-info {
			margin: 0 0 1rem;
			color: $gray-30;
		}
	}
	.cleanup-results {
		margin-top: 1rem;
		padding: 1rem;
		background: rgba($blue-60, 0.1);
		border-radius: 8px;

		h3 {
			margin: 0 0 0.5rem;
			color: $blue-60;
			font-size: 1rem;
		}

		p {
			margin: 0.25rem 0;
			color: $gray-30;
			font-size: 0.875rem;
		}
	}
</style>
