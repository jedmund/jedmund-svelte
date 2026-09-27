<script lang="ts">
	import type { Media } from '@prisma/client'
	import { formatFileSize } from '$lib/utils/mediaHelpers'
	let { item }: { item: Media } = $props()
</script>

<div class="media-info">
	<span class="filename">{item.filename}</span>
	<div class="media-info-bottom">
		<div class="media-indicators">
			{#if item.isPhotography}
				<span class="indicator-pill photography" title="Photography"> Photo </span>
			{/if}
			{#if item.description}
				<span class="indicator-pill alt-text" title="Description: {item.description}"> Alt </span>
			{:else}
				<span class="indicator-pill no-alt-text" title="No description"> No Alt </span>
			{/if}
		</div>
		<span class="filesize">{formatFileSize(item.size)}</span>
	</div>
</div>

<style lang="scss">
	.media-info {
		padding: $unit-2x;
		display: flex;
		flex-direction: column;
		gap: $unit;

		.filename {
			font-size: 1rem;
			color: $gray-20;
			font-weight: 400;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		.filesize {
			font-size: 0.75rem;
			color: $gray-40;
		}

		.media-info-bottom {
			display: flex;
			justify-content: space-between;
			align-items: center;
			gap: $unit-half;
		}

		.media-indicators {
			display: flex;
			gap: $unit-half;
			flex-wrap: wrap;
			margin: $unit-half 0;
		}
	}
	.indicator-pill {
		display: inline-flex;
		align-items: center;
		gap: $unit-half;
		padding: $unit-half $unit;
		border-radius: $corner-radius-2xl;
		font-size: 0.8rem;
		font-weight: 500;
		line-height: 1;

		&.photography {
			background-color: rgba(139, 92, 246, 0.1);
			color: #7c3aed;
		}

		&.alt-text {
			background-color: rgba(34, 197, 94, 0.1);
			color: #16a34a;
		}

		&.no-alt-text {
			background-color: rgba(239, 68, 68, 0.1);
			color: #dc2626;
		}
	}
</style>
