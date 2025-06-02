<script lang="ts">
	import Modal from './Modal.svelte'
	import Button from './Button.svelte'
	import LoadingSpinner from './LoadingSpinner.svelte'

	interface Props {
		isOpen: boolean
		onClose: () => void
		onUploadComplete: () => void
	}

	let { isOpen = $bindable(), onClose, onUploadComplete }: Props = $props()

	let files = $state<File[]>([])
	let dragActive = $state(false)
	let isUploading = $state(false)
	let uploadProgress = $state<Record<string, number>>({})
	let uploadErrors = $state<string[]>([])
	let successCount = $state(0)
	let fileInput: HTMLInputElement

	// Reset state when modal opens/closes
	$effect(() => {
		if (!isOpen) {
			files = []
			dragActive = false
			isUploading = false
			uploadProgress = {}
			uploadErrors = []
			successCount = 0
		}
	})

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
		// Filter for image files
		const imageFiles = newFiles.filter((file) => file.type.startsWith('image/'))

		if (imageFiles.length !== newFiles.length) {
			uploadErrors = [
				...uploadErrors,
				`${newFiles.length - imageFiles.length} non-image files were skipped`
			]
		}

		files = [...files, ...imageFiles]
	}

	function removeFile(index: number) {
		files = files.filter((_, i) => i !== index)
		// Clear any related upload progress
		const fileName = files[index]?.name
		if (fileName && uploadProgress[fileName]) {
			const { [fileName]: removed, ...rest } = uploadProgress
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

		const auth = localStorage.getItem('admin_auth')
		if (!auth) {
			uploadErrors = ['Authentication required']
			isUploading = false
			return
		}

		// Upload files individually to show progress
		for (const file of files) {
			try {
				const formData = new FormData()
				formData.append('file', file)

				const response = await fetch('/api/media/upload', {
					method: 'POST',
					headers: {
						Authorization: `Basic ${auth}`
					},
					body: formData
				})

				if (!response.ok) {
					const error = await response.json()
					uploadErrors = [...uploadErrors, `${file.name}: ${error.message || 'Upload failed'}`]
				} else {
					successCount++
					uploadProgress = { ...uploadProgress, [file.name]: 100 }
				}
			} catch (error) {
				uploadErrors = [...uploadErrors, `${file.name}: Network error`]
			}
		}

		isUploading = false

		// If all uploads succeeded, close modal and refresh media list
		if (successCount === files.length && uploadErrors.length === 0) {
			setTimeout(() => {
				onUploadComplete()
				onClose()
			}, 1500)
		}
	}

	function clearAll() {
		files = []
		uploadProgress = {}
		uploadErrors = []
		successCount = 0
	}

	function handleClose() {
		if (!isUploading) {
			onClose()
		}
	}
</script>

<Modal bind:isOpen on:close={handleClose} size="large">
	<div class="upload-modal-content">
		<div class="modal-header">
			<h2>Upload Media</h2>
		</div>
		<!-- Drop Zone -->
		<div class="modal-inner-content">
			<div
				class="drop-zone"
				class:active={dragActive}
				class:has-files={files.length > 0}
				ondragover={handleDragOver}
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
						<h3>Drop images here</h3>
						<p>or click to browse and select files</p>
						<p class="upload-hint">Supports JPG, PNG, GIF, WebP, and SVG files</p>
					{:else}
						<div class="file-count">
							<strong>{files.length} file{files.length !== 1 ? 's' : ''} selected</strong>
							<p>Drop more files to add them, or click to browse</p>
						</div>
					{/if}
				</div>

				<input
					bind:this={fileInput}
					type="file"
					multiple
					accept="image/*"
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
		</div>

		<!-- File List -->
		{#if files.length > 0}
			<div class="file-list">
				<div class="file-list-header">
					<h3>Files to Upload</h3>
					<div class="file-actions">
						<Button variant="secondary" size="small" onclick={clearAll} disabled={isUploading}>
							Clear All
						</Button>
						<Button
							variant="primary"
							size="small"
							onclick={uploadFiles}
							disabled={isUploading || files.length === 0}
						>
							{#if isUploading}
								<LoadingSpinner size="small" />
								Uploading...
							{:else}
								Upload {files.length} File{files.length !== 1 ? 's' : ''}
							{/if}
						</Button>
					</div>
				</div>

				<div class="files">
					{#each files as file, index}
						<div class="file-item">
							<div class="file-preview">
								{#if file.type.startsWith('image/')}
									<img src={URL.createObjectURL(file)} alt={file.name} />
								{:else}
									<div class="file-icon">📄</div>
								{/if}
							</div>

							<div class="file-info">
								<div class="file-name">{file.name}</div>
								<div class="file-size">{formatFileSize(file.size)}</div>

								{#if uploadProgress[file.name]}
									<div class="progress-bar">
										<div class="progress-fill" style="width: {uploadProgress[file.name]}%"></div>
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

		<!-- Upload Results -->
		{#if successCount > 0 || uploadErrors.length > 0}
			<div class="upload-results">
				{#if successCount > 0}
					<div class="success-message">
						✅ Successfully uploaded {successCount} file{successCount !== 1 ? 's' : ''}
						{#if successCount === files.length && uploadErrors.length === 0}
							<br /><small>Closing modal...</small>
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
</Modal>

<style lang="scss">
	.upload-modal-content {
		display: flex;
		flex-direction: column;
		max-height: 70vh;
		overflow-y: auto;
	}

	.modal-header {
		display: flex;
		flex-direction: row;
		padding: $unit-2x $unit-3x $unit $unit-3x;

		h2 {
			margin: 0;
			font-size: 1.5rem;
			font-weight: 600;
			color: $grey-10;
		}
	}

	.modal-inner-content {
		padding: $unit $unit-3x $unit-3x;
	}

	.drop-zone {
		border: 2px dashed $grey-80;
		border-radius: $unit-2x;
		padding: $unit-6x $unit-4x;
		text-align: center;
		position: relative;
		background: $grey-95;
		transition: all 0.2s ease;

		&.active {
			border-color: #3b82f6;
			background: rgba(59, 130, 246, 0.05);
		}

		&.has-files {
			padding: $unit-4x;
		}

		&:hover {
			border-color: $grey-60;
			background: $grey-90;
		}
	}

	.drop-zone-content {
		pointer-events: none;

		.upload-icon {
			color: $grey-50;
			margin-bottom: $unit-2x;
		}

		h3 {
			font-size: 1.25rem;
			color: $grey-20;
			margin-bottom: $unit;
		}

		p {
			color: $grey-40;
			margin-bottom: $unit-half;
		}

		.upload-hint {
			font-size: 0.875rem;
			color: $grey-50;
		}

		.file-count {
			strong {
				color: $grey-20;
				font-size: 1.1rem;
			}
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
		border: 1px solid $grey-85;
		border-radius: $unit-2x;
		padding: $unit-3x;
	}

	.file-list-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: $unit-3x;
		padding-bottom: $unit-2x;
		border-bottom: 1px solid $grey-85;

		h3 {
			margin: 0;
			color: $grey-20;
		}

		.file-actions {
			display: flex;
			gap: $unit-2x;
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
		background: $grey-95;
		border-radius: $unit;
		border: 1px solid $grey-85;
	}

	.file-preview {
		width: 60px;
		height: 60px;
		border-radius: $unit;
		overflow: hidden;
		background: $grey-90;
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
			color: $grey-20;
			margin-bottom: $unit-half;
		}

		.file-size {
			font-size: 0.875rem;
			color: $grey-50;
			margin-bottom: $unit-half;
		}
	}

	.progress-bar {
		width: 100%;
		height: 4px;
		background: $grey-85;
		border-radius: 2px;
		overflow: hidden;

		.progress-fill {
			height: 100%;
			background: #3b82f6;
			transition: width 0.3s ease;
		}
	}

	.remove-button {
		background: none;
		border: none;
		color: $grey-50;
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
		border: 1px solid $grey-85;
		border-radius: $unit-2x;
		padding: $unit-3x;

		.success-message {
			color: #16a34a;
			margin-bottom: $unit-2x;

			small {
				color: $grey-50;
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

	// Responsive adjustments
	@media (max-width: 768px) {
		.upload-modal-content {
			max-height: 80vh;
		}

		.drop-zone {
			padding: $unit-4x $unit-2x;
		}

		.file-item {
			flex-direction: column;
			align-items: flex-start;
			gap: $unit-2x;
		}

		.file-list-header {
			flex-direction: column;
			align-items: flex-start;
			gap: $unit-2x;
		}
	}
</style>
