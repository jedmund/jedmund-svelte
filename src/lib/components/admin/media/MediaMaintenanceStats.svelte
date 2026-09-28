<script lang="ts">
	import type { MediaStats } from '$lib/admin/media/maintenance-requests'
	let { stats }: { stats: MediaStats | null } = $props()
</script>

{#if stats}
	<div class="stats-grid">
		<div class="stat-card">
			<h3>Total Media</h3>
			<p class="value">{stats.totalMedia.toLocaleString()}</p>
		</div>
		<div class="stat-card">
			<h3>Missing Colors</h3>
			<p class="value">{stats.missingColors.toLocaleString()}</p>
		</div>
		<div class="stat-card">
			<h3>Missing Aspect Ratio</h3>
			<p class="value">{stats.missingAspectRatio.toLocaleString()}</p>
		</div>
		<div class="stat-card">
			<h3>Outdated Thumbnails</h3>
			<p class="value">{stats.outdatedThumbnails.toLocaleString()}</p>
		</div>
		<div class="stat-card">
			<h3>Grey Dominant Colors</h3>
			<p class="value">{stats.greyDominantColors.toLocaleString()}</p>
		</div>
	</div>
{/if}

<style lang="scss">
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}
	.stat-card {
		background: $gray-97;
		border: 1px solid $gray-90;
		border-radius: 8px;
		padding: 1.5rem;

		h3 {
			margin: 0 0 0.5rem;
			font-size: 0.875rem;
			font-weight: 500;
			color: $gray-30;
			text-transform: uppercase;
			letter-spacing: 0.05em;
		}

		.value {
			margin: 0;
			font-size: 2rem;
			font-weight: 600;
			color: $gray-10;
		}
	}
</style>
