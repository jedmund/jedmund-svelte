<script lang="ts">
	import type { Media } from '@prisma/client'
	import SmartImage from '../../SmartImage.svelte'
	import FileIcon from '../../icons/FileIcon.svelte'
	import { getFileType, isVideoFile } from '$lib/utils/mediaHelpers'
	let { media }: { media: Media } = $props()
</script>

<div class="image-pane">
	{#if media.mimeType.startsWith('image/')}
		<div class="image-container">
			<SmartImage {media} alt={media.description || media.filename} class="preview-image" />
		</div>
	{:else if isVideoFile(media.mimeType)}
		<div class="video-container">
			<video controls poster={media.thumbnailUrl || undefined} class="preview-video">
				<source src={media.url} type={media.mimeType} />
				<track kind="captions" />
				Your browser does not support the video tag.
			</video>
		</div>
	{:else}
		<div class="file-placeholder">
			<FileIcon size={64} />
			<span class="file-type">{getFileType(media.mimeType)}</span>
		</div>
	{/if}
</div>

<style lang="scss">
	.image-pane {
		flex: 1;
		background-color: #000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: $unit-4x;
		position: relative;
		overflow: hidden;

		.image-container {
			max-width: 90%;
			max-height: 90%;
			position: relative;
			display: flex;
			align-items: center;
			justify-content: center;

			:global(.preview-image) {
				width: 100%;
				height: 100%;
				object-fit: contain;
				border-radius: $corner-radius-md;
				display: block;
			}
		}

		.video-container {
			max-width: 90%;
			position: relative;
			display: flex;
			align-items: center;
			justify-content: center;

			.preview-video {
				width: 100%;
				height: auto;
				max-width: 100%;
				object-fit: contain;
				background: #000;
				border-radius: $corner-radius-md;
			}
		}

		.file-placeholder {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: $unit-2x;
			color: rgba(255, 255, 255, 0.6);

			.file-type {
				font-size: 0.875rem;
				font-weight: 500;
			}
		}
	}
	@media (max-width: 768px) {
		.image-pane {
			height: 300px;
			flex: none;
		}
	}
</style>
