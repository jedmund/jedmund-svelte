<script lang="ts">
	import { formatFileSize, isImageFile } from '$lib/utils/mediaHelpers'
	import type { Media } from '@prisma/client'

	interface FilePreview {
		file?: File
		media?: Media
		id: string | number
		name: string
		size: number
		type: string
		url: string
	}

	interface Props {
		files: (File | Media)[]
		onRemove?: (id: string | number) => void
		uploadProgress?: Record<string, number>
		uploadErrors?: string[]
		isUploading?: boolean
		variant?: 'upload' | 'attached'
		class?: string
	}

	let {
		files = [],
		onRemove,
		uploadProgress = {},
		uploadErrors = [],
		isUploading = false,
		variant = 'upload',
		class: className = ''
	}: Props = $props()

	// Convert files to preview format
	const previews = $derived<FilePreview[]>(
		files.map((item) => {
			if ('url' in item) {
				// It's a Media object
				return {
					media: item,
					id: item.id,
					name: item.filename,
					size: item.size,
					type: item.mimeType,
					url: item.url
				}
			} else {
				// It's a File object
				return {
					file: item,
					id: item.name,
					name: item.name,
					size: item.size,
					type: item.type,
					url: URL.createObjectURL(item)
				}
			}
		})
	)

	function handleRemove(preview: FilePreview) {
		onRemove?.(preview.id)
		// Clean up object URLs
		if (preview.file) {
			URL.revokeObjectURL(preview.url)
		}
	}

	// Clean up object URLs on unmount
	$effect(() => {
		return () => {
			previews.forEach((preview) => {
				if (preview.file) {
					URL.revokeObjectURL(preview.url)
				}
			})
		}
	})
</script>

<div class="file-preview-list {variant} {className}">
	{#each previews as preview (preview.id)}
		<div class="file-item">
			<div class="file-preview">
				{#if isImageFile(preview.type)}
					<img src={preview.url} alt={preview.name} />
				{:else}
					<div class="file-icon">📄</div>
				{/if}
			</div>

			<div class="file-info">
				<div class="file-name">{preview.name}</div>
				<div class="file-size">{formatFileSize(preview.size)}</div>
			</div>

			{#if !isUploading && onRemove}
				<button
					type="button"
					class="remove-button"
					onclick={() => handleRemove(preview)}
					title="Remove file"
					aria-label="Remove file"
				>
					<svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<line x1="18" y1="6" x2="6" y2="18"></line>
						<line x1="6" y1="6" x2="18" y2="18"></line>
					</svg>
				</button>
			{/if}

			{#if variant === 'upload' && isUploading && preview.file}
				<div class="progress-bar-container">
					<div class="progress-bar">
						<div class="progress-fill" style="width: {uploadProgress[preview.name] || 0}%"></div>
					</div>
					<div class="upload-status">
						{#if uploadProgress[preview.name] === 100}
							<span class="status-complete">✓</span>
						{:else if uploadProgress[preview.name] > 0}
							<span class="status-uploading">{Math.round(uploadProgress[preview.name] || 0)}%</span>
						{:else}
							<span class="status-waiting">Waiting...</span>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	{/each}

	{#if uploadErrors.length > 0}
		<div class="upload-errors">
			{#each uploadErrors as error}
				<div class="error-item">❌ {error}</div>
			{/each}
		</div>
	{/if}
</div>

<style lang="scss">
	.file-preview-list {
		display: flex;
		flex-direction: column;
		gap: $unit;

		&.attached {
			flex-direction: row;
			flex-wrap: wrap;

			.file-item {
				width: auto;
				padding: 0;
				background: none;
				border: none;
			}

			.file-preview {
				width: 64px;
				height: 64px;
				border-radius: 12px;
			}

			.file-info,
			.progress-bar-container {
				display: none;
			}
		}
	}

	.file-item {
		display: flex;
		align-items: center;
		gap: $unit-2x;
		padding: $unit;
		background: $gray-95;
		border-radius: $image-corner-radius;
		border: 1px solid $gray-85;
		position: relative;
	}

	.file-preview {
		width: 60px;
		height: 60px;
		border-radius: $unit;
		overflow: hidden;
		background: $gray-90;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}

		.file-icon {
			font-size: 1.5rem;
		}
	}

	.file-info {
		flex: 1;

		.file-name {
			font-weight: 500;
			color: $gray-20;
			margin-bottom: $unit-half;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		.file-size {
			font-size: 0.875rem;
			color: $gray-50;
		}
	}

	.progress-bar-container {
		display: flex;
		min-width: 120px;
		align-items: center;
		gap: $unit;
	}

	.progress-bar {
		flex-grow: 1;
		height: $unit-2x;
		background: $gray-100;
		padding: $unit-half;
		border-radius: $corner-radius-full;
		border: 1px solid $gray-85;
		overflow: hidden;

		.progress-fill {
			border-radius: $corner-radius-full;
			height: 100%;
			background: $red-60;
			transition: width 0.3s ease;
			position: relative;

			&::after {
				content: '';
				position: absolute;
				top: 0;
				left: 0;
				bottom: 0;
				right: 0;
				background: linear-gradient(
					90deg,
					transparent 30%,
					rgba(255, 255, 255, 0.2) 50%,
					transparent 70%
				);
				animation: shimmer 1.5s infinite;
			}
		}
	}

	@keyframes shimmer {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(100%);
		}
	}

	.upload-status {
		font-size: 0.75rem;
		font-weight: 500;
		min-width: 40px;
		text-align: right;

		.status-complete {
			color: #16a34a;
		}

		.status-uploading {
			color: $red-60;
		}

		.status-waiting {
			color: $gray-50;
		}
	}

	.remove-button {
		background: none;
		border: none;
		color: $gray-50;
		cursor: pointer;
		padding: $unit;
		border-radius: 50%;
		transition: all 0.2s ease;

		&:hover {
			background: $red-60;
			color: white;
		}

		.attached & {
			position: absolute;
			top: -6px;
			right: -6px;
			width: 20px;
			height: 20px;
			padding: 0;
			background: rgba(0, 0, 0, 0.8);
			color: white;
			display: flex;
			align-items: center;
			justify-content: center;
			opacity: 0;

			svg {
				width: 10px;
				height: 10px;
			}
		}
	}

	.attached .file-item:hover .remove-button {
		opacity: 1;
	}

	.upload-errors {
		margin-top: $unit-2x;

		.error-item {
			color: $red-60;
			margin-bottom: $unit;
			font-size: 0.875rem;
		}
	}
</style>
