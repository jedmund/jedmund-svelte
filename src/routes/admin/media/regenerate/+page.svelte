<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import Button from '$lib/components/admin/Button.svelte'
	import Modal from '$lib/components/admin/Modal.svelte'
	import { Play, Palette, Image, Sparkles } from 'lucide-svelte'
	import ChevronLeft from '$icons/chevron-left.svg'

	let extractingColors = $state(false)
	let regeneratingThumbnails = $state(false)
	let reanalyzingColors = $state(false)
	let colorExtractionResults: {
		processed: number
		succeeded: number
		failed: number
		errors: string[]
		photosUpdated: number
	} | null = $state(null)
	let thumbnailResults: {
		processed: number
		succeeded: number
		failed: number
		errors: string[]
	} | null = $state(null)
	let reanalysisResults: {
		processed: number
		updated: number
		skipped: number
		errors: string[]
	} | null = $state(null)
	let showResultsModal = $state(false)
	let error: string | null = $state(null)
	let mediaStats = $state<{
		totalMedia: number
		missingColors: number
		missingAspectRatio: number
		outdatedThumbnails: number
		greyDominantColors: number
	} | null>(null)

	onMount(() => {
		// Check authentication
		const auth = localStorage.getItem('admin_auth')
		if (!auth) {
			goto('/admin/login')
		} else {
			fetchMediaStats()
		}
	})

	async function fetchMediaStats() {
		try {
			const auth = localStorage.getItem('admin_auth')
			if (!auth) return

			const response = await fetch('/api/admin/media-stats', {
				headers: {
					Authorization: `Basic ${auth}`
				}
			})

			if (!response.ok) {
				throw new Error('Failed to fetch media stats')
			}

			mediaStats = await response.json()
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to fetch media stats'
		}
	}

	async function extractColors() {
		extractingColors = true
		error = null
		colorExtractionResults = null

		try {
			const auth = localStorage.getItem('admin_auth')
			if (!auth) {
				error = 'Not authenticated'
				return
			}

			const response = await fetch('/api/admin/cloudinary-extract-colors', {
				method: 'POST',
				headers: {
					Authorization: `Basic ${auth}`
				}
			})

			if (!response.ok) {
				throw new Error('Failed to extract colors')
			}

			colorExtractionResults = await response.json()
			showResultsModal = true
			
			// Refresh stats
			await fetchMediaStats()
		} catch (err) {
			error = err instanceof Error ? err.message : 'An error occurred'
		} finally {
			extractingColors = false
		}
	}

	async function regenerateThumbnails() {
		regeneratingThumbnails = true
		error = null
		thumbnailResults = null

		try {
			const auth = localStorage.getItem('admin_auth')
			if (!auth) {
				error = 'Not authenticated'
				return
			}

			const response = await fetch('/api/admin/regenerate-thumbnails', {
				method: 'POST',
				headers: {
					Authorization: `Basic ${auth}`
				}
			})

			if (!response.ok) {
				throw new Error('Failed to regenerate thumbnails')
			}

			thumbnailResults = await response.json()
			showResultsModal = true
			
			// Refresh stats
			await fetchMediaStats()
		} catch (err) {
			error = err instanceof Error ? err.message : 'An error occurred'
		} finally {
			regeneratingThumbnails = false
		}
	}

	async function reanalyzeColors() {
		reanalyzingColors = true
		error = null
		reanalysisResults = null

		try {
			const auth = localStorage.getItem('admin_auth')
			if (!auth) {
				error = 'Not authenticated'
				return
			}

			const response = await fetch('/api/admin/reanalyze-colors', {
				method: 'POST',
				headers: {
					Authorization: `Basic ${auth}`
				}
			})

			if (!response.ok) {
				throw new Error('Failed to reanalyze colors')
			}

			reanalysisResults = await response.json()
			showResultsModal = true
			
			// Refresh stats
			await fetchMediaStats()
		} catch (err) {
			error = err instanceof Error ? err.message : 'An error occurred'
		} finally {
			reanalyzingColors = false
		}
	}
</script>

<svelte:head>
	<title>Regenerate Cloudinary - Admin @jedmund</title>
</svelte:head>

<AdminPage>
	<header slot="header">
		<div class="header-left">
			<button class="btn-icon" onclick={() => goto('/admin/media')}>
				<ChevronLeft />
			</button>
			<h1>Regenerate Cloudinary Data</h1>
		</div>
	</header>

	{#if error}
		<div class="error-message">
			<p>{error}</p>
		</div>
	{/if}

	{#if mediaStats}
		<div class="stats-grid">
			<div class="stat-card">
				<h3>Total Media</h3>
				<p class="value">{mediaStats.totalMedia.toLocaleString()}</p>
			</div>
			<div class="stat-card">
				<h3>Missing Colors</h3>
				<p class="value">{mediaStats.missingColors.toLocaleString()}</p>
			</div>
			<div class="stat-card">
				<h3>Missing Aspect Ratio</h3>
				<p class="value">{mediaStats.missingAspectRatio.toLocaleString()}</p>
			</div>
			<div class="stat-card">
				<h3>Outdated Thumbnails</h3>
				<p class="value">{mediaStats.outdatedThumbnails.toLocaleString()}</p>
			</div>
			<div class="stat-card">
				<h3>Grey Dominant Colors</h3>
				<p class="value">{mediaStats.greyDominantColors.toLocaleString()}</p>
			</div>
		</div>
	{/if}

	<div class="regenerate-section">
		<div class="action-card">
			<div class="action-header">
				<Palette size={24} />
				<h2>Extract Dominant Colors</h2>
			</div>
			<p>Analyze images to extract dominant colors for better loading states. This process uses Cloudinary's color analysis API.</p>
			<div class="action-details">
				<ul>
					<li>Extracts the primary color from each image</li>
					<li>Stores full color palette data</li>
					<li>Calculates and saves aspect ratios</li>
					<li>Updates both Media and Photo records</li>
				</ul>
			</div>
			<Button
				variant="primary"
				onclick={extractColors}
				disabled={extractingColors || regeneratingThumbnails || reanalyzingColors}
				icon={Play}
				iconPosition="left"
			>
				{extractingColors ? 'Extracting Colors...' : 'Extract Colors'}
			</Button>
		</div>

		<div class="action-card">
			<div class="action-header">
				<Image size={24} />
				<h2>Regenerate Thumbnails</h2>
			</div>
			<p>Update thumbnails to maintain aspect ratio with 800px on the long edge instead of fixed 800x600 dimensions.</p>
			<div class="action-details">
				<ul>
					<li>Preserves original aspect ratios</li>
					<li>Sets longest edge to 800px</li>
					<li>Updates thumbnail URLs in database</li>
					<li>Processes only images with outdated thumbnails</li>
				</ul>
			</div>
			<Button
				variant="primary"
				onclick={regenerateThumbnails}
				disabled={extractingColors || regeneratingThumbnails || reanalyzingColors}
				icon={Play}
				iconPosition="left"
			>
				{regeneratingThumbnails ? 'Regenerating Thumbnails...' : 'Regenerate Thumbnails'}
			</Button>
		</div>

		<div class="action-card">
			<div class="action-header">
				<Sparkles size={24} />
				<h2>Smart Color Reanalysis</h2>
			</div>
			<p>Use advanced color detection to pick vibrant subject colors instead of background greys.</p>
			<div class="action-details">
				<ul>
					<li>Analyzes existing color data intelligently</li>
					<li>Prefers vibrant colors from subjects</li>
					<li>Avoids grey backgrounds automatically</li>
					<li>Updates both Media and Photo records</li>
				</ul>
			</div>
			<Button
				variant="primary"
				onclick={reanalyzeColors}
				disabled={extractingColors || regeneratingThumbnails || reanalyzingColors}
				icon={Play}
				iconPosition="left"
			>
				{reanalyzingColors ? 'Reanalyzing Colors...' : 'Reanalyze Colors'}
			</Button>
		</div>
	</div>
</AdminPage>

<!-- Results Modal -->
<Modal bind:isOpen={showResultsModal}>
	<div class="modal-content">
		<div class="modal-header">
			<h2>
				{colorExtractionResults ? 'Color Extraction Results' : thumbnailResults ? 'Thumbnail Regeneration Results' : 'Color Reanalysis Results'}
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
							{#each colorExtractionResults.errors.slice(0, 10) as error}
								<li>{error}</li>
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
							{#each thumbnailResults.errors.slice(0, 10) as error}
								<li>{error}</li>
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
							{#each reanalysisResults.errors.slice(0, 10) as error}
								<li>{error}</li>
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
			<Button variant="primary" onclick={() => {
				showResultsModal = false
				colorExtractionResults = null
				thumbnailResults = null
				reanalysisResults = null
			}}>Close</Button>
		</div>
	</div>
</Modal>

<style lang="scss">
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 1rem;

		h1 {
			margin: 0;
			font-size: 1.5rem;
			font-weight: 600;
			color: $grey-10;
		}
	}

	.btn-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		padding: 0;
		background: transparent;
		border: 1px solid $grey-85;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s ease;
		color: $grey-30;

		&:hover {
			background: $grey-95;
			border-color: $grey-70;
			color: $grey-10;
		}

		:global(svg) {
			width: 20px;
			height: 20px;
		}
	}

	.error-message {
		background: rgba($red-60, 0.1);
		border: 1px solid rgba($red-60, 0.2);
		border-radius: 8px;
		padding: 1rem;
		margin-bottom: 2rem;

		p {
			margin: 0;
			color: $red-60;
		}
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.stat-card {
		background: $grey-97;
		border: 1px solid $grey-90;
		border-radius: 8px;
		padding: 1.5rem;

		h3 {
			margin: 0 0 0.5rem;
			font-size: 0.875rem;
			font-weight: 500;
			color: $grey-30;
			text-transform: uppercase;
			letter-spacing: 0.05em;
		}

		.value {
			margin: 0;
			font-size: 2rem;
			font-weight: 600;
			color: $grey-10;
		}
	}

	.regenerate-section {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
		gap: 2rem;
		margin-top: 2rem;
	}

	.action-card {
		background: $grey-100;
		border: 1px solid $grey-90;
		border-radius: 12px;
		padding: 2rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;

		.action-header {
			display: flex;
			align-items: center;
			gap: 1rem;

			:global(svg) {
				color: $primary-color;
			}

			h2 {
				margin: 0;
				font-size: 1.25rem;
				font-weight: 600;
				color: $grey-10;
			}
		}

		p {
			margin: 0;
			color: $grey-30;
			line-height: 1.6;
		}

		.action-details {
			background: $grey-97;
			border-radius: 8px;
			padding: 1rem;

			ul {
				margin: 0;
				padding-left: 1.5rem;
				list-style-type: disc;

				li {
					margin: 0.25rem 0;
					font-size: 0.875rem;
					color: $grey-30;
				}
			}
		}
	}

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
			color: $grey-10;
		}
	}

	.results {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;

		p {
			margin: 0;
			font-size: 0.875rem;
			color: $grey-30;

			strong {
				color: $grey-10;
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
				color: $grey-30;
				margin: 0.25rem 0;
			}
		}
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid $grey-90;
	}
</style>