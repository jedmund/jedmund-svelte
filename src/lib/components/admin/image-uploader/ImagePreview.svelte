<script lang="ts">
	import type { Media } from '@prisma/client'
	import type { Snippet } from 'svelte'
	import { RefreshCw, Trash2 } from '@lucide/svelte'
	import Button from '../Button.svelte'
	import SmartImage from '../../SmartImage.svelte'

	interface Props {
		media: Media
		compact: boolean
		aspectRatio?: string
		onReplace: () => void
		onRemove: () => void
		children: Snippet
	}
	let { media, compact, aspectRatio, onReplace, onRemove, children }: Props = $props()
</script>

<div class="preview-layout" class:compact>
	<div class="image-preview" style:aspect-ratio={aspectRatio?.replace(':', '/') || undefined}>
		<SmartImage
			{media}
			alt={media.description || media.filename || 'Uploaded image'}
			containerWidth={compact ? 100 : 800}
			loading="eager"
			{aspectRatio}
			class="preview-image"
		/>
		<div class="preview-overlay">
			<div class="preview-actions">
				<Button
					type="button"
					variant="overlay"
					buttonSize="small"
					aria-label="Replace image"
					onclick={onReplace}
				>
					{#snippet icon()}<RefreshCw size={compact ? 12 : 16} />{/snippet}
					{#if !compact}Replace{/if}
				</Button>
				<Button
					type="button"
					variant="overlay"
					buttonSize="small"
					aria-label="Remove image"
					onclick={onRemove}
				>
					{#snippet icon()}<Trash2 size={compact ? 12 : 16} />{/snippet}
					{#if !compact}Remove{/if}
				</Button>
			</div>
		</div>
	</div>
	{#if !compact}
		<div class="file-info">
			<p class="filename">{media.originalName || media.filename}</p>
			<p class="file-meta">
				{Math.round(media.size / 1024)} KB
				{#if media.width && media.height}
					• {media.width}×{media.height}{/if}
			</p>
		</div>
	{/if}
	<div class="metadata">{@render children()}</div>
</div>

<style lang="scss">
	.preview-layout {
		display: flex;
		flex-direction: column;
		gap: $unit-2x;
	}
	.image-preview {
		position: relative;
		border-radius: $card-corner-radius;
		overflow: hidden;
		background-color: $gray-95;
		min-height: 200px;
		:global(.preview-image) {
			width: 100%;
			height: 100%;
			object-fit: cover;
			display: block;
		}
		&:hover .preview-overlay,
		&:focus-within .preview-overlay {
			opacity: 1;
		}
	}
	.preview-overlay {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		transition: opacity 0.2s ease;
	}
	.preview-actions {
		display: flex;
		gap: $unit;
	}
	.filename {
		margin: 0 0 $unit-half;
		font-size: 0.875rem;
		color: $gray-10;
		font-weight: 500;
	}
	.file-meta {
		margin: 0;
		font-size: 0.75rem;
		color: $gray-40;
	}
	.metadata {
		min-width: 0;
	}
	.compact {
		flex-direction: row;
		gap: $unit-3x;
		align-items: flex-start;
		.image-preview {
			width: 100px;
			height: 100px;
			min-height: 0;
			flex-shrink: 0;
			border: 1px solid $gray-90;
			:global(.preview-image) {
				object-fit: contain;
				padding: $unit-3x;
				box-sizing: border-box;
			}
		}
		.preview-overlay {
			background: rgba(0, 0, 0, 0.7);
		}
		.preview-actions {
			gap: $unit-half;
		}
		.metadata {
			flex: 1;
		}
	}
	@media (hover: none) {
		.preview-overlay {
			opacity: 1;
		}
	}
	@media (max-width: 640px) {
		.preview-actions {
			flex-direction: column;
		}
	}
</style>
