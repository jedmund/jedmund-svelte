<script lang="ts">
	import Modal from './Modal.svelte'
	import Button from './Button.svelte'
	import FileUploadZone from './FileUploadZone.svelte'
	import FilePreviewList from './FilePreviewList.svelte'
	import { formatFileSize } from '$lib/utils/mediaHelpers'

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

	function handleFilesAdded(newFiles: File[]) {
		addFiles(newFiles)
	}

	function addFiles(newFiles: File[]) {
		// Filter for supported file types (images and videos)
		const supportedFiles = newFiles.filter(
			(file) => file.type.startsWith('image/') || file.type.startsWith('video/')
		)

		if (supportedFiles.length !== newFiles.length) {
			uploadErrors = [
				...uploadErrors,
				`${newFiles.length - supportedFiles.length} unsupported files were skipped`
			]
		}

		files = [...files, ...supportedFiles]
	}

	function removeFile(id: string | number) {
		// For files, the id is the filename
		const fileToRemove = files.find((f) => f.name === id)
		if (fileToRemove) {
			files = files.filter((f) => f.name !== id)
			// Clear any related upload progress
			if (uploadProgress[fileToRemove.name]) {
				const { [fileToRemove.name]: removed, ...rest } = uploadProgress
				uploadProgress = rest
			}
		}
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
		<div class="modal-inner-content">
			<!-- File List (shown above drop zone when files are selected) -->
			{#if files.length > 0}
				<FilePreviewList
					{files}
					onRemove={removeFile}
					{uploadProgress}
					{isUploading}
					variant="upload"
				/>
			{/if}

			<!-- Drop Zone (compact when files are selected) -->
			<FileUploadZone
				onFilesAdded={handleFilesAdded}
				accept={['image/*', 'video/*']}
				multiple={true}
				compact={files.length > 0}
				disabled={isUploading}
				{dragActive}
			/>

			<!-- Upload Results -->
			{#if successCount > 0}
				<div class="upload-results">
					<div class="success-message">
						✅ Successfully uploaded {successCount} file{successCount !== 1 ? 's' : ''}
						{#if successCount === files.length && uploadErrors.length === 0}
							<br /><small>Closing modal...</small>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Error messages are now handled in FilePreviewList -->
		</div>

		<!-- Modal Footer with actions -->
		<div class="modal-footer">
			<Button
				variant="secondary"
				buttonSize="medium"
				onclick={clearAll}
				disabled={isUploading || files.length === 0}
			>
				Clear all
			</Button>
			<Button
				variant="primary"
				buttonSize="medium"
				onclick={uploadFiles}
				disabled={isUploading || files.length === 0}
				loading={isUploading}
			>
				{isUploading
					? 'Uploading...'
					: files.length > 0
						? `Upload ${files.length} file${files.length !== 1 ? 's' : ''}`
						: 'Upload files'}
			</Button>
		</div>
	</div>
</Modal>

<style lang="scss">
	.upload-modal-content {
		display: flex;
		flex-direction: column;
		// height: 70vh;
		max-height: 70vh;
	}

	.modal-header {
		display: flex;
		flex-direction: row;
		padding: $unit-2x $unit-3x $unit $unit-3x;

		h2 {
			margin: 0;
			font-size: 1.5rem;
			font-weight: 600;
			color: $gray-10;
		}
	}

	.modal-inner-content {
		padding: $unit $unit-3x $unit-3x;
		display: flex;
		flex-direction: column;
		gap: $unit-2x;
		flex: 1;
		overflow-y: auto;
	}

	.modal-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: $unit-3x;
		border-top: 1px solid $gray-85;
		background: $gray-95;
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
	}
</style>
