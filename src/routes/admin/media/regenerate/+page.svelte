<script lang="ts">
	import MediaMaintenanceStats from '$lib/components/admin/media/MediaMaintenanceStats.svelte'
	import RegenerationResults from '$lib/components/admin/media/RegenerationResults.svelte'
	import { goto } from '$app/navigation'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import Button from '$lib/components/admin/Button.svelte'
	import { Play, Palette, Image, Sparkles } from '@lucide/svelte'
	import ChevronLeft from '$icons/chevron-left.svg?component'

	import { createRegenerationController } from '$lib/admin/media/regenerate-controller.svelte'
	const maintenance = createRegenerationController()
</script>

<svelte:head>
	<title>Regenerate Cloudinary - Admin @jedmund</title>
</svelte:head>

<AdminPage>
	{#snippet header()}
		<header>
			<div class="header-left">
				<button class="btn-icon" onclick={() => goto('/admin/media')}>
					<ChevronLeft />
				</button>
				<h1>Regenerate Cloudinary Data</h1>
			</div>
		</header>
	{/snippet}

	{#if maintenance.error}
		<div class="error-message">
			<p>{maintenance.error}</p>
		</div>
	{/if}

	<MediaMaintenanceStats stats={maintenance.mediaStats} />

	<div class="regenerate-section">
		<div class="action-card">
			<div class="action-header">
				<Palette size={24} />
				<h2>Extract Dominant Colors</h2>
			</div>
			<p>
				Analyze images to extract dominant colors for better loading states. This process uses
				Cloudinary's color analysis API.
			</p>
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
				onclick={maintenance.extractColors}
				disabled={maintenance.extractingColors ||
					maintenance.regeneratingThumbnails ||
					maintenance.reanalyzingColors}
				iconPosition="left"
			>
				{#snippet icon()}<Play />{/snippet}
				{maintenance.extractingColors ? 'Extracting Colors...' : 'Extract Colors'}
			</Button>
		</div>

		<div class="action-card">
			<div class="action-header">
				<Image size={24} />
				<h2>Regenerate Thumbnails</h2>
			</div>
			<p>
				Update thumbnails to maintain aspect ratio with 800px on the long edge instead of fixed
				800x600 dimensions.
			</p>
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
				onclick={maintenance.regenerateThumbnails}
				disabled={maintenance.extractingColors ||
					maintenance.regeneratingThumbnails ||
					maintenance.reanalyzingColors}
				iconPosition="left"
			>
				{#snippet icon()}<Play />{/snippet}
				{maintenance.regeneratingThumbnails
					? 'Regenerating Thumbnails...'
					: 'Regenerate Thumbnails'}
			</Button>
		</div>

		<div class="action-card">
			<div class="action-header">
				<Sparkles size={24} />
				<h2>Smart Color Reanalysis</h2>
			</div>
			<p>
				Use advanced color detection to pick vibrant subject colors instead of background greys.
			</p>
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
				onclick={maintenance.reanalyzeColors}
				disabled={maintenance.extractingColors ||
					maintenance.regeneratingThumbnails ||
					maintenance.reanalyzingColors}
				iconPosition="left"
			>
				{#snippet icon()}<Play />{/snippet}
				{maintenance.reanalyzingColors ? 'Reanalyzing Colors...' : 'Reanalyze Colors'}
			</Button>
		</div>
	</div>
</AdminPage>

<RegenerationResults
	clearResults={maintenance.clearResults}
	colorExtractionResults={maintenance.colorExtractionResults}
	reanalysisResults={maintenance.reanalysisResults}
	bind:showResultsModal={maintenance.showResultsModal}
	thumbnailResults={maintenance.thumbnailResults}
/>

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
			color: $gray-10;
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
		border: 1px solid $gray-85;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s ease;
		color: $gray-30;

		&:hover {
			background: $gray-95;
			border-color: $gray-70;
			color: $gray-10;
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

	.regenerate-section {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
		gap: 2rem;
		margin-top: 2rem;
	}

	.action-card {
		background: $gray-100;
		border: 1px solid $gray-90;
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
				color: $gray-10;
			}
		}

		p {
			margin: 0;
			color: $gray-30;
			line-height: 1.6;
		}

		.action-details {
			background: $gray-97;
			border-radius: 8px;
			padding: 1rem;

			ul {
				margin: 0;
				padding-left: 1.5rem;
				list-style-type: disc;

				li {
					margin: 0.25rem 0;
					font-size: 0.875rem;
					color: $gray-30;
				}
			}
		}
	}
</style>
