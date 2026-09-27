<script lang="ts">
	import type { Media } from '@prisma/client'
	import { formatFileSize } from '$lib/utils/mediaHelpers'
	let { media, showDimensions }: { media: Media; showDimensions: boolean } = $props()
</script>

<div class="image-details">
	<div class="detail-row">
		<span class="detail-label">Filename:</span>
		<span class="detail-value">{media.filename}</span>
	</div>
	<div class="detail-row">
		<span class="detail-label">Size:</span>
		<span class="detail-value">{formatFileSize(media.size, 1, 'B')}</span>
	</div>
	{#if showDimensions && media.width && media.height}
		<div class="detail-row">
			<span class="detail-label">Dimensions:</span>
			<span class="detail-value">{media.width} × {media.height} px</span>
		</div>
	{/if}
</div>

<style lang="scss">
	.image-details {
		padding: $unit-2x;
		background-color: $gray-95;
		border-radius: $card-corner-radius;
		display: flex;
		flex-direction: column;
		gap: $unit-half;
	}
	.detail-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.875rem;
	}
	.detail-label {
		font-weight: 500;
		color: $gray-30;
	}
	.detail-value {
		color: $gray-10;
		text-align: right;
		word-break: break-all;
	}
	@media (max-width: 640px) {
		.detail-row {
			flex-direction: column;
			align-items: flex-start;
			gap: $unit-half;
		}
	}
	@media (max-width: 640px) {
		.detail-value {
			text-align: left;
		}
	}
</style>
