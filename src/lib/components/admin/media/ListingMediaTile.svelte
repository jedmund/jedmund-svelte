<script lang="ts">
	import type { Media } from '@prisma/client'
	import PlayIcon from '$icons/play.svg?component'
	import { getFileType, isVideoFile } from '$lib/utils/mediaHelpers'
	import ListingMediaInfo from './ListingMediaInfo.svelte'
	let {
		item,
		isMultiSelectMode,
		selected,
		onSelect,
		onOpen
	}: {
		item: Media
		isMultiSelectMode: boolean
		selected: boolean
		onSelect: () => void
		onOpen: () => void
	} = $props()
</script>

<div class="media-item-wrapper" class:multiselect={isMultiSelectMode}>
	{#if isMultiSelectMode}
		<div class="selection-checkbox">
			<input type="checkbox" checked={selected} onchange={() => onSelect()} id="media-{item.id}" />
			<label for="media-{item.id}" class="checkbox-label"></label>
		</div>
	{/if}
	<button
		class="media-item"
		type="button"
		onclick={() => (isMultiSelectMode ? onSelect() : onOpen())}
		title="{isMultiSelectMode ? 'Click to select' : 'Click to edit'} {item.filename}"
		class:selected={isMultiSelectMode && selected}
	>
		{#if item.mimeType.startsWith('image/')}
			<img
				src={item.mimeType === 'image/svg+xml' ? item.url : item.thumbnailUrl || item.url}
				alt={item.description || item.filename}
			/>
		{:else if isVideoFile(item.mimeType)}
			{#if item.thumbnailUrl}
				<div class="video-thumbnail-wrapper">
					<img src={item.thumbnailUrl} alt={item.description || item.filename} />
					<div class="video-overlay">
						<PlayIcon class="play-icon" />
					</div>
				</div>
			{:else}
				<div class="file-placeholder video-placeholder">
					<PlayIcon class="video-icon" />
					<span class="file-type">Video</span>
				</div>
			{/if}
		{:else}
			<div class="file-placeholder">
				<span class="file-type">{getFileType(item.mimeType)}</span>
			</div>
		{/if}
		<ListingMediaInfo {item} />
	</button>
</div>

<style lang="scss">
	.media-item {
		background: $gray-95;
		border: 1px solid transparent;
		border-radius: $unit-2x;
		overflow: hidden;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: left;
		width: 100%;
		padding: 0;

		&:hover {
			background-color: $gray-90;
			transform: translateY(-2px);
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
			border: 1px solid rgba(0, 0, 0, 0.08);
		}

		&:focus {
			outline: 2px solid #3b82f6;
			outline-offset: 2px;
		}

		img {
			width: 100%;
			height: 150px;
			object-fit: cover;
		}

		.video-thumbnail-wrapper {
			width: 100%;
			height: 150px;
			position: relative;
			overflow: hidden;

			img {
				width: 100%;
				height: 100%;
				object-fit: cover;
			}

			.video-overlay {
				position: absolute;
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%);
				background: rgba(0, 0, 0, 0.7);
				border-radius: 50%;
				width: 40px;
				height: 40px;
				display: flex;
				align-items: center;
				justify-content: center;
				pointer-events: none;

				:global(.play-icon) {
					width: 20px;
					height: 20px;
					color: white;
					margin-left: -2px;
				}
			}
		}

		.file-placeholder {
			width: 100%;
			height: 150px;
			display: flex;
			align-items: center;
			justify-content: center;
			background: $gray-90;

			&.video-placeholder {
				flex-direction: column;
				gap: $unit;

				:global(.video-icon) {
					width: 24px;
					height: 24px;
					color: $gray-60;
				}
			}

			.file-type {
				font-size: 0.875rem;
				color: $gray-40;
			}
		}
	}
	.media-item-wrapper {
		position: relative;

		&.multiselect {
			.selection-checkbox {
				position: absolute;
				top: $unit;
				left: $unit;
				z-index: 10;

				input[type='checkbox'] {
					opacity: 0;
					position: absolute;
					pointer-events: none;
				}

				.checkbox-label {
					display: block;
					width: 20px;
					height: 20px;
					border: 2px solid white;
					border-radius: 4px;
					background: rgba(0, 0, 0, 0.5);
					cursor: pointer;
					position: relative;
					transition: all 0.2s ease;

					&::after {
						content: '';
						position: absolute;
						top: 50%;
						left: 50%;
						width: 4px;
						height: 8px;
						border: solid white;
						border-width: 0 2px 2px 0;
						transform: translate(-50%, -60%) rotate(45deg);
						opacity: 0;
						transition: opacity 0.2s ease;
					}
				}

				input:checked + .checkbox-label {
					background: #3b82f6;
					border-color: #3b82f6;

					&::after {
						opacity: 1;
					}
				}
			}

			.media-item {
				&.selected {
					background-color: rgba(59, 130, 246, 0.1);
					border: 2px solid #3b82f6;
				}
			}
		}
	}
</style>
