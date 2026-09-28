<script lang="ts">
	import type { createRegenerationController } from '$lib/admin/media/regenerate-controller.svelte'
	import Button from '../Button.svelte'
	import Modal from '../Modal.svelte'

	let {
		clearResults,
		colorExtractionResults,
		reanalysisResults,
		showResultsModal = $bindable(),
		thumbnailResults
	}: {
		clearResults: ReturnType<typeof createRegenerationController>['clearResults']
		colorExtractionResults: ReturnType<
			typeof createRegenerationController
		>['colorExtractionResults']
		reanalysisResults: ReturnType<typeof createRegenerationController>['reanalysisResults']
		showResultsModal: ReturnType<typeof createRegenerationController>['showResultsModal']
		thumbnailResults: ReturnType<typeof createRegenerationController>['thumbnailResults']
	} = $props()
</script>

<!-- Results Modal -->
<Modal bind:isOpen={showResultsModal}>
	<div class="modal-content">
		<div class="modal-header">
			<h2>
				{colorExtractionResults
					? 'Color Extraction Results'
					: thumbnailResults
						? 'Thumbnail Regeneration Results'
						: 'Color Reanalysis Results'}
			</h2>
		</div>

		{#if colorExtractionResults}
			<div class="results">
				<p><strong>Processed:</strong> {colorExtractionResults.processed} media items</p>
				<p><strong>Succeeded:</strong> {colorExtractionResults.succeeded}</p>
				<p><strong>Failed:</strong> {colorExtractionResults.failed}</p>
				<p><strong>Photos Updated:</strong> {colorExtractionResults.photosUpdated}</p>

				{#if colorExtractionResults.errors.length > 0}
					<div class="errors-section">
						<h3>Errors:</h3>
						<ul>
							{#each colorExtractionResults.errors.slice(0, 10) as errorMessage}
								<li>{errorMessage}</li>
							{/each}
							{#if colorExtractionResults.errors.length > 10}
								<li>... and {colorExtractionResults.errors.length - 10} more errors</li>
							{/if}
						</ul>
					</div>
				{/if}
			</div>
		{/if}

		{#if thumbnailResults}
			<div class="results">
				<p><strong>Processed:</strong> {thumbnailResults.processed} media items</p>
				<p><strong>Succeeded:</strong> {thumbnailResults.succeeded}</p>
				<p><strong>Failed:</strong> {thumbnailResults.failed}</p>

				{#if thumbnailResults.errors.length > 0}
					<div class="errors-section">
						<h3>Errors:</h3>
						<ul>
							{#each thumbnailResults.errors.slice(0, 10) as errorMessage}
								<li>{errorMessage}</li>
							{/each}
							{#if thumbnailResults.errors.length > 10}
								<li>... and {thumbnailResults.errors.length - 10} more errors</li>
							{/if}
						</ul>
					</div>
				{/if}
			</div>
		{/if}

		{#if reanalysisResults}
			<div class="results">
				<p><strong>Processed:</strong> {reanalysisResults.processed} media items</p>
				<p><strong>Updated:</strong> {reanalysisResults.updated} (colors improved)</p>
				<p><strong>Skipped:</strong> {reanalysisResults.skipped} (already optimal)</p>

				{#if reanalysisResults.errors.length > 0}
					<div class="errors-section">
						<h3>Errors:</h3>
						<ul>
							{#each reanalysisResults.errors.slice(0, 10) as errorMessage}
								<li>{errorMessage}</li>
							{/each}
							{#if reanalysisResults.errors.length > 10}
								<li>... and {reanalysisResults.errors.length - 10} more errors</li>
							{/if}
						</ul>
					</div>
				{/if}
			</div>
		{/if}

		<div class="modal-actions">
			<Button
				variant="primary"
				onclick={() => {
					showResultsModal = false
					clearResults()
				}}>Close</Button
			>
		</div>
	</div>
</Modal>

<style lang="scss">
	.modal-content {
		display: flex;
		flex-direction: column;
		padding: 1.5rem;
		min-width: 500px;
		max-width: 600px;
	}
	.modal-header {
		margin-bottom: 1.5rem;

		h2 {
			margin: 0;
			font-size: 1.25rem;
			font-weight: 600;
			color: $gray-10;
		}
	}
	.results {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;

		p {
			margin: 0;
			font-size: 0.875rem;
			color: $gray-30;

			strong {
				color: $gray-10;
			}
		}
	}
	.errors-section {
		margin-top: 1rem;
		padding: 1rem;
		background: rgba($red-60, 0.1);
		border-radius: 8px;
		border: 1px solid rgba($red-60, 0.2);

		h3 {
			margin: 0 0 0.5rem;
			font-size: 1rem;
			color: $red-60;
		}

		ul {
			margin: 0;
			padding-left: 1.5rem;
			list-style-type: disc;

			li {
				font-size: 0.75rem;
				color: $gray-30;
				margin: 0.25rem 0;
			}
		}
	}
	.modal-actions {
		display: flex;
		justify-content: flex-end;
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid $gray-90;
	}
</style>
