<script lang="ts">
	import Button from './Button.svelte'
	import { formatFileSize, getFileType, isVideoFile, formatDuration, formatBitrate } from '$lib/utils/mediaHelpers'
	import type { Media } from '@prisma/client'

	interface Props {
		media: Media
		showExifToggle?: boolean
		class?: string
	}

	let { media, showExifToggle = true, class: className = '' }: Props = $props()

	let showExif = $state(false)
</script>

<div class="media-metadata-panel {className}">
	<div class="info-grid">
		<div class="info-item">
			<span class="label">Type</span>
			<span class="value">{getFileType(media.mimeType)}</span>
		</div>
		<div class="info-item">
			<span class="label">Size</span>
			<span class="value">{formatFileSize(media.size)}</span>
		</div>
	</div>

	{#if showExif}
		<div class="details-data">
			<!-- Media metadata -->
			<div class="media-metadata">
				{#if media.width && media.height}
					<div class="info-item">
						<span class="label">Dimensions</span>
						<span class="value">{media.width} × {media.height}px</span>
					</div>
				{/if}
				{#if isVideoFile(media.mimeType)}
					{#if media.duration}
						<div class="info-item">
							<span class="label">Duration</span>
							<span class="value">{formatDuration(media.duration)}</span>
						</div>
					{/if}
					{#if media.videoCodec}
						<div class="info-item">
							<span class="label">Video Codec</span>
							<span class="value">{media.videoCodec.toUpperCase()}</span>
						</div>
					{/if}
					{#if media.audioCodec}
						<div class="info-item">
							<span class="label">Audio Codec</span>
							<span class="value">{media.audioCodec.toUpperCase()}</span>
						</div>
					{/if}
					{#if media.bitrate}
						<div class="info-item">
							<span class="label">Bitrate</span>
							<span class="value">{formatBitrate(media.bitrate)}</span>
						</div>
					{/if}
				{:else if media.dominantColor}
					<div class="info-item">
						<span class="label">Dominant Color</span>
						<span class="value color-value">
							<span
								class="color-swatch"
								style="background-color: {media.dominantColor}"
								title={media.dominantColor}
							></span>
							{media.dominantColor}
						</span>
					</div>
				{/if}
				<div class="info-item">
					<span class="label">Uploaded</span>
					<span class="value">{new Date(media.createdAt).toLocaleDateString()}</span>
				</div>
			</div>

			<!-- EXIF metadata -->
			{#if media.exifData && typeof media.exifData === 'object' && Object.keys(media.exifData).length > 0}
				<div class="metadata-divider"></div>
				<div class="exif-metadata">
					{#if media.exifData.camera}
						<div class="info-item">
							<span class="label">Camera</span>
							<span class="value">{media.exifData.camera}</span>
						</div>
					{/if}
					{#if media.exifData.lens}
						<div class="info-item">
							<span class="label">Lens</span>
							<span class="value">{media.exifData.lens}</span>
						</div>
					{/if}
					{#if media.exifData.focalLength}
						<div class="info-item">
							<span class="label">Focal Length</span>
							<span class="value">{media.exifData.focalLength}</span>
						</div>
					{/if}
					{#if media.exifData.aperture}
						<div class="info-item">
							<span class="label">Aperture</span>
							<span class="value">{media.exifData.aperture}</span>
						</div>
					{/if}
					{#if media.exifData.shutterSpeed}
						<div class="info-item">
							<span class="label">Shutter Speed</span>
							<span class="value">{media.exifData.shutterSpeed}</span>
						</div>
					{/if}
					{#if media.exifData.iso}
						<div class="info-item">
							<span class="label">ISO</span>
							<span class="value">{media.exifData.iso}</span>
						</div>
					{/if}
					{#if media.exifData.dateTaken}
						<div class="info-item">
							<span class="label">Date Taken</span>
							<span class="value">{new Date(media.exifData.dateTaken).toLocaleDateString()}</span>
						</div>
					{/if}
					{#if media.exifData.coordinates}
						<div class="info-item">
							<span class="label">GPS</span>
							<span class="value">
								{media.exifData.coordinates.latitude.toFixed(6)},
								{media.exifData.coordinates.longitude.toFixed(6)}
							</span>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{/if}

	{#if showExifToggle}
		<Button
			variant="ghost"
			onclick={() => (showExif = !showExif)}
			buttonSize="small"
			fullWidth
			pill={false}
			class="exif-toggle"
		>
			{showExif ? 'Hide Details' : 'Show Details'}
		</Button>
	{/if}
</div>

<style lang="scss">
	.media-metadata-panel {
		display: flex;
		flex-direction: column;
		gap: $unit-3x;
		padding: $unit-3x;
		background-color: $gray-90;
		border-radius: $corner-radius-md;
	}

	.info-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: $unit-3x;
	}

	.info-item {
		display: flex;
		flex-direction: column;
		gap: $unit-half;

		&.vertical {
			grid-column: 1 / -1;
		}

		.label {
			font-size: 0.75rem;
			font-weight: 500;
			color: $gray-50;
			text-transform: uppercase;
			letter-spacing: 0.05em;
		}

		.value {
			font-size: 0.875rem;
			color: $gray-10;
			font-weight: 500;

			&.color-value {
				display: flex;
				align-items: center;
				gap: $unit-2x;
			}
		}
	}

	.color-swatch {
		display: inline-block;
		width: $unit-20px;
		height: $unit-20px;
		border-radius: $corner-radius-xs;
		border: $unit-1px solid rgba(0, 0, 0, 0.1);
		box-shadow: inset 0 0 0 $unit-1px rgba(255, 255, 255, 0.1);
	}

	:global(.btn.btn-ghost.exif-toggle) {
		margin-top: $unit-2x;
		justify-content: center;
		background: transparent;
		border: $unit-1px solid $gray-70;

		&:hover {
			background: rgba(0, 0, 0, 0.02);
			border-color: $gray-70;
		}
	}

	.media-metadata,
	.exif-metadata {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: $unit-3x;
	}

	.metadata-divider {
		border-radius: $unit-1px;
		height: $unit-2px;
		background: $gray-80;
		margin: $unit-3x 0;
	}

	.details-data {
		display: flex;
		flex-direction: column;
	}
</style>
