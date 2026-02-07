<script lang="ts">
	import { goto } from '$app/navigation'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import Button from '$lib/components/admin/Button.svelte'

	let files = $state<File[]>([])
	let dragActive = $state(false)
	let isUploading = $state(false)
	let uploadProgress = $state<Record<string, number>>({})
	let uploadErrors = $state<string[]>([])
	let successCount = $state(0)
	let fileInput: HTMLInputElement

	function handleDragOver(event: DragEvent) {
		event.preventDefault()
		dragActive = true
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault()
		dragActive = false
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault()
		dragActive = false

		const droppedFiles = Array.from(event.dataTransfer?.files || [])
		addFiles(droppedFiles)
	}

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement
		const selectedFiles = Array.from(target.files || [])
		addFiles(selectedFiles)
	}

	function addFiles(newFiles: File[]) {
		// Filter for supported file types (images and videos)
		const supportedFiles = newFiles.filter((file) => 
			file.type.startsWith('image/') || file.type.startsWith('video/')
		)

		if (supportedFiles.length !== newFiles.length) {
			uploadErrors = [
				...uploadErrors,
				`${newFiles.length - supportedFiles.length} unsupported files were skipped`
			]
		}

		files = [...files, ...supportedFiles]
	}

	function removeFile(index: number) {
		files = files.filter((_, i) => i !== index)
		// Clear any related upload progress
		const fileName = files[index]?.name
		if (fileName && uploadProgress[fileName]) {
			const { [fileName]: _removed, ...rest } = uploadProgress
			uploadProgress = rest
		}
	}

	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 Bytes'
		const k = 1024
		const sizes = ['Bytes', 'KB', 'MB', 'GB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
	}

	async function uploadFiles() {
		if (files.length === 0) return

		isUploading = true
		uploadErrors = []
		successCount = 0
		uploadProgress = {}

		// Upload files individually to show progress
		for (const file of files) {
			try {
				const formData = new FormData()
				formData.append('file', file)

				const response = await fetch('/api/media/upload', {
					method: 'POST',
					body: formData,
					credentials: 'same-origin'
				})

				if (!response.ok) {
					const error = await response.json()
					uploadErrors = [...uploadErrors, `${file.name}: ${error.message || 'Upload failed'}`]
				} else {
					successCount++
					uploadProgress = { ...uploadProgress, [file.name]: 100 }
				}
			} catch (_error) {
				uploadErrors = [...uploadErrors, `${file.name}: Network error`]
			}
		}

		isUploading = false

		// If all uploads succeeded, redirect back to media library
		if (successCount === files.length && uploadErrors.length === 0) {
			setTimeout(() => {
				goto('/admin/media')
			}, 1500)
		}
	}

	function clearAll() {
		files = []
		uploadProgress = {}
		uploadErrors = []
		successCount = 0
	}
</script>

<svelte:head>
	<title>Upload Media - Admin @jedmund</title>
</svelte:head>

<AdminPage>
	{#snippet header()}
	<header>
		<h1>Upload Media</h1>
		<div class="header-actions">
			<Button variant="secondary" onclick={() => goto('/admin/media')}>
				← Back to Media Library
			</Button>
		</div>
	</header>
	{/snippet}

	<div class="upload-container">
		<!-- File List -->
		{#if files.length > 0}
			<div class="file-list">
				<div class="file-list-header">
					<h3>Files to Upload</h3>
					<div class="file-actions">
						<Button
							variant="primary"
							buttonSize="small"
							onclick={uploadFiles}
							disabled={isUploading || files.length === 0}
							loading={isUploading}
						>
							{isUploading
								? 'Uploading...'
								: `Upload ${files.length} File${files.length !== 1 ? 's' : ''}`}
						</Button>
						<Button
							variant="ghost"
							buttonSize="icon"
							onclick={clearAll}
							disabled={isUploading}
							title="Clear all files"
						>
							{#snippet icon()}<svg
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							>
								<circle cx="12" cy="12" r="10"></circle>
								<line x1="8" y1="8" x2="16" y2="16"></line>
								<line x1="16" y1="8" x2="8" y2="16"></line>
							</svg>{/snippet}
						</Button>
					</div>
				</div>

				<div class="files">
					{#each files as file, index}
						<div class="file-item">
							<div class="file-preview">
								{#if file.type.startsWith('image/')}
									<img src={URL.createObjectURL(file)} alt={file.name} />
								{:else if file.type.startsWith('video/')}
									<div class="file-icon">🎬</div>
								{:else}
									<div class="file-icon">📄</div>
								{/if}
							</div>

							<div class="file-info">
								<div class="file-name">{file.name}</div>
								<div class="file-size">{formatFileSize(file.size)}</div>

								{#if isUploading}
									<div class="progress-bar">
										<div
											class="progress-fill"
											style="width: {uploadProgress[file.name] || 0}%"
										></div>
									</div>
									<div class="upload-status">
										{#if uploadProgress[file.name] === 100}
											<span class="status-complete">✓ Complete</span>
										{:else if uploadProgress[file.name] > 0}
											<span class="status-uploading"
												>{Math.round(uploadProgress[file.name] || 0)}%</span
											>
										{:else}
											<span class="status-waiting">Waiting...</span>
										{/if}
									</div>
								{/if}
							</div>

							{#if !isUploading}
								<button
									type="button"
									class="remove-button"
									onclick={() => removeFile(index)}
									title="Remove file"
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
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Drop Zone -->
		<div
			class="drop-zone"
			class:active={dragActive}
			class:has-files={files.length > 0}
			class:compact={files.length > 0}
			class:uploading={isUploading}
		role="region"
		aria-label="File upload drop zone"			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
		>
			<div class="drop-zone-content">
				{#if files.length === 0}
					<div class="upload-icon">
						<svg
							width="48"
							height="48"
							viewBox="0 0 24 24"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
							<polyline
								points="14,2 14,8 20,8"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
							<line
								x1="16"
								y1="13"
								x2="8"
								y2="13"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
							<line
								x1="16"
								y1="17"
								x2="8"
								y2="17"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
							<polyline
								points="10,9 9,9 8,9"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					</div>
					<h3>Drop media files here</h3>
					<p>or click to browse and select files</p>
					<p class="upload-hint">Images: JPG, PNG, GIF, WebP, SVG | Videos: WebM, MP4, OGG, MOV, AVI</p>
				{:else}
					<div class="compact-content">
						<svg
							class="add-icon"
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<line
								x1="12"
								y1="5"
								x2="12"
								y2="19"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
							/>
							<line
								x1="5"
								y1="12"
								x2="19"
								y2="12"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
							/>
						</svg>
						<span>Add more files or drop them here</span>
					</div>
				{/if}
			</div>

			<input
				bind:this={fileInput}
				type="file"
				multiple
				accept="image/*,video/*"
				onchange={handleFileSelect}
				class="hidden-input"
			/>

			<button
				type="button"
				class="drop-zone-button"
				onclick={() => fileInput.click()}
				disabled={isUploading}
			>
				{dragActive ? 'Drop files' : 'Click to browse'}
			</button>
		</div>

		<!-- Upload Results -->
		{#if successCount > 0 || uploadErrors.length > 0}
			<div class="upload-results">
				{#if successCount > 0}
					<div class="success-message">
						✅ Successfully uploaded {successCount} file{successCount !== 1 ? 's' : ''}
						{#if successCount === files.length && uploadErrors.length === 0}
							<br /><small>Redirecting to media library...</small>
						{/if}
					</div>
				{/if}

				{#if uploadErrors.length > 0}
					<div class="error-messages">
						<h4>Upload Errors:</h4>
						{#each uploadErrors as error}
							<div class="error-item">❌ {error}</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</AdminPage>

<style lang="scss">
	.upload-container {
		max-width: 800px;
		margin: 0 auto;
		padding: $unit-4x;
	}

	.header-actions {
		display: flex;
		gap: $unit-2x;
	}

	.drop-zone {
		border: 2px dashed $gray-80;
		border-radius: $unit-2x;
		padding: $unit-6x $unit-4x;
		text-align: center;
		position: relative;
		background: $gray-95;
		transition: all 0.2s ease;
		margin-bottom: $unit-4x;

		&.active {
			border-color: #3b82f6;
			background: rgba(59, 130, 246, 0.05);
		}

		&.has-files {
			padding: $unit-4x;
		}

		&.compact {
			padding: $unit-3x;
			min-height: auto;

			.drop-zone-content {
				.compact-content {
					display: flex;
					align-items: center;
					justify-content: center;
					gap: $unit-2x;
					color: $gray-40;
					font-size: 0.875rem;

					.add-icon {
						color: $gray-50;
					}
				}
			}
		}

		&:hover {
			border-color: $gray-60;
			background: $gray-90;
		}

		&.uploading {
			border-color: #3b82f6;
			border-style: solid;
			background: rgba(59, 130, 246, 0.02);
			pointer-events: none;
		}
	}

	.drop-zone-content {
		pointer-events: none;

		.upload-icon {
			color: $gray-50;
			margin-bottom: $unit-2x;
		}

		h3 {
			font-size: 1.25rem;
			color: $gray-20;
			margin-bottom: $unit;
		}

		p {
			color: $gray-40;
			margin-bottom: $unit-half;
		}

		.upload-hint {
			font-size: 0.875rem;
			color: $gray-50;
		}
	}

	.hidden-input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.drop-zone-button {
		position: absolute;
		inset: 0;
		background: transparent;
		border: none;
		cursor: pointer;
		color: transparent;

		&:disabled {
			cursor: not-allowed;
		}
	}

	.file-list {
		background: white;
		border: 1px solid $gray-85;
		border-radius: $unit-2x;
		padding: $unit-3x;
		margin-bottom: $unit-3x;
	}

	.file-list-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: $unit-3x;
		padding-bottom: $unit-2x;
		border-bottom: 1px solid $gray-85;

		h3 {
			margin: 0;
			color: $gray-20;
		}

		.file-actions {
			display: flex;
			gap: $unit-2x;
			align-items: center;
		}
	}

	.files {
		display: flex;
		flex-direction: column;
		gap: $unit-2x;
	}

	.file-item {
		display: flex;
		align-items: center;
		gap: $unit-3x;
		padding: $unit-2x;
		background: $gray-95;
		border-radius: $unit;
		border: 1px solid $gray-85;
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
		}

		.file-size {
			font-size: 0.875rem;
			color: $gray-50;
			margin-bottom: $unit-half;
		}
	}

	.progress-bar {
		width: 100%;
		height: 6px;
		background: $gray-90;
		border-radius: 3px;
		overflow: hidden;
		margin-bottom: $unit-half;

		.progress-fill {
			height: 100%;
			background: #3b82f6;
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

		.status-complete {
			color: #16a34a;
		}

		.status-uploading {
			color: #3b82f6;
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
	}

	.upload-results {
		background: white;
		border: 1px solid $gray-85;
		border-radius: $unit-2x;
		padding: $unit-3x;

		.success-message {
			color: #16a34a;
			margin-bottom: $unit-2x;

			small {
				color: $gray-50;
			}
		}

		.error-messages {
			h4 {
				color: $red-60;
				margin-bottom: $unit-2x;
			}

			.error-item {
				color: $red-60;
				margin-bottom: $unit;
				font-size: 0.925rem;
			}
		}
	}
</style>
