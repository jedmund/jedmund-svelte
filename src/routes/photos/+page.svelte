<script lang="ts">
	import PhotoGrid from '$components/PhotoGrid.svelte'
	import type { PageData } from './$types'

	const { data }: { data: PageData } = $props()

	const photoItems = $derived(data.photoItems || [])
	const error = $derived(data.error)
</script>

<div class="photos-page">
	{#if error}
		<div class="error-container">
			<div class="error-message">
				<h2>Unable to load photos</h2>
				<p>{error}</p>
			</div>
		</div>
	{:else if photoItems.length === 0}
		<div class="empty-container">
			<div class="empty-message">
				<h2>No photos yet</h2>
				<p>Photography albums will appear here once published.</p>
			</div>
		</div>
	{:else}
		<PhotoGrid {photoItems} />
	{/if}
</div>

<style lang="scss">
	.photos-page {
		width: 100%;
		max-width: 900px;
		margin: 0 auto;
		padding: $unit-4x $unit-3x;

		@include breakpoint('phone') {
			padding: $unit-3x $unit-2x;
		}
	}

	.error-container,
	.empty-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 60vh;
	}

	.error-message,
	.empty-message {
		text-align: center;
		max-width: 500px;

		h2 {
			font-size: 1.5rem;
			font-weight: 600;
			margin: 0 0 $unit-2x;
			color: $grey-10;
		}

		p {
			margin: 0;
			color: $grey-40;
			line-height: 1.5;
		}
	}

	.error-message {
		h2 {
			color: $red-60;
		}
	}
</style>
