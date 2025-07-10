<script lang="ts">
	import SmartImage from '../SmartImage.svelte'
	import FileIcon from '../icons/FileIcon.svelte'
	import { isImageFile } from '$lib/utils/mediaHelpers'
	import type { Media } from '@prisma/client'

	interface Props {
		media: Media[]
		selectedIds?: Set<number>
		onItemClick?: (item: Media) => void
		isLoading?: boolean
		emptyMessage?: string
		mode?: 'select' | 'view'
		class?: string
	}

	let {
		media = [],
		selectedIds = new Set(),
		onItemClick,
		isLoading = false,
		emptyMessage = 'No media found',
		mode = 'view',
		class: className = ''
	}: Props = $props()

	function isSelected(item: Media): boolean {
		return selectedIds.has(item.id)
	}

	function handleClick(item: Media) {
		onItemClick?.(item)
	}
</script>

<div class="media-grid-container {className}">
	{#if isLoading && media.length === 0}
		<!-- Loading skeleton -->
		<div class="media-grid">
			{#each Array(12) as _, i}
				<div class="media-item skeleton" aria-hidden="true">
					<div class="media-thumbnail skeleton-bg"></div>
				</div>
			{/each}
		</div>
	{:else if media.length === 0}
		<div class="empty-state">
			<svg
				width="64"
				height="64"
				viewBox="0 0 24 24"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="2" />
				<circle cx="8.5" cy="8.5" r=".5" fill="currentColor" />
				<path d="M3 16l5-5 3 3 4-4 4 4" stroke="currentColor" stroke-width="2" fill="none" />
			</svg>
			<p>{emptyMessage}</p>
		</div>
	{:else}
		<div class="media-grid">
			{#each media as item, i (item.id)}
				<button
					type="button"
					class="media-item"
					class:selected={mode === 'select' && isSelected(item)}
					onclick={() => handleClick(item)}
					title={mode === 'select'
						? `Click to ${isSelected(item) ? 'deselect' : 'select'}`
						: 'Click to view details'}
				>
					<!-- Thumbnail -->
					<div
						class="media-thumbnail"
						class:is-svg={item.mimeType === 'image/svg+xml'}
						style="background-color: {item.mimeType === 'image/svg+xml'
							? 'transparent'
							: item.dominantColor || '#f5f5f5'}"
					>
						{#if isImageFile(item.mimeType)}
							<SmartImage
								media={item}
								alt={item.filename}
								loading={i < 8 ? 'eager' : 'lazy'}
								class="media-image {item.mimeType === 'image/svg+xml' ? 'svg-image' : ''}"
								containerWidth={150}
							/>
						{:else}
							<div class="media-placeholder">
								<FileIcon size={32} />
							</div>
						{/if}

						<!-- Hover Overlay -->
						<div class="hover-overlay"></div>

						<!-- Selected Indicator -->
						{#if mode === 'select' && isSelected(item)}
							<div class="selected-indicator">
								<svg
									width="18"
									height="18"
									viewBox="0 0 24 24"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										d="M7 13l3 3 7-7"
										stroke="white"
										stroke-width="3"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
								</svg>
							</div>
						{/if}
					</div>
				</button>
			{/each}
		</div>
	{/if}
</div>

<style lang="scss">
	.media-grid-container {
		display: flex;
		flex-direction: column;
		width: 100%;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: $unit-6x;
		text-align: center;
		color: $gray-40;
		min-height: 400px;

		svg {
			color: $gray-70;
			margin-bottom: $unit-2x;
		}

		p {
			margin: 0;
			color: $gray-50;
			font-size: 1rem;
		}
	}

	.media-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: $unit-2x;
		padding: $unit-3x 0;
	}

	.media-item {
		position: relative;
		aspect-ratio: 1;
		background: $gray-95;
		border: none;
		border-radius: $unit-2x;
		overflow: hidden;
		cursor: pointer;
		transition: all 0.2s ease;
		padding: 0;

		&:hover .hover-overlay {
			opacity: 1;
		}

		&.selected {
			border: 2px solid $blue-50;
			background-color: rgba(59, 130, 246, 0.05);
		}
	}

	.media-thumbnail {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
		transition: background-color 0.3s ease;

		:global(.media-image) {
			width: 100%;
			height: 100%;
			object-fit: cover;
			animation: fadeIn 0.3s ease-in-out;
		}

		&.is-svg {
			padding: $unit-2x;
			box-sizing: border-box;
			background-color: $gray-95 !important;

			:global(.svg-image) {
				object-fit: contain !important;
			}
		}
	}

	.media-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: $gray-60;
	}

	.hover-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(255, 255, 255, 0.1);
		opacity: 0;
		transition: opacity 0.2s ease;
		pointer-events: none;
	}

	.selected-indicator {
		position: absolute;
		top: $unit;
		right: $unit;
		width: 28px;
		height: 28px;
		background: $blue-50;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	// Skeleton loader styles
	.skeleton {
		pointer-events: none;
		cursor: default;
	}

	.skeleton-bg {
		background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
		background-size: 200% 100%;
		animation: shimmer 1.5s infinite;
	}

	@keyframes shimmer {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}
</style>
