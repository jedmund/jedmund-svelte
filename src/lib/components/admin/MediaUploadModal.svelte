<script lang="ts">
	import { untrack } from 'svelte'
	import Modal from './Modal.svelte'
	import Button from './Button.svelte'
	import FileUploadZone from './FileUploadZone.svelte'
	import FilePreviewList from './FilePreviewList.svelte'
	import { createUploadCompletion } from '$lib/admin/media/upload-completion'
	import { createUploadQueue, emptyUploadQueue } from '$lib/admin/media/upload-queue'

	let {
		isOpen = $bindable(),
		onClose,
		onUploadComplete
	}: {
		isOpen: boolean
		onClose: () => void
		onUploadComplete: () => void | Promise<void>
	} = $props()
	let uploadState = $state.raw(emptyUploadQueue())
	let queue: ReturnType<typeof createUploadQueue> | undefined
	const completion = createUploadCompletion()
	const files = $derived(uploadState.entries.map((entry) => entry.file))
	const isUploading = $derived(uploadState.running)
	const uploadErrors = $derived(uploadState.errors)
	const successCount = $derived(
		uploadState.entries.filter((entry) => entry.status === 'complete').length
	)
	$effect(() => {
		if (!isOpen) return
		const session = createUploadQueue({ onChange: (value) => (uploadState = value) })
		untrack(() => {
			uploadState = emptyUploadQueue()
			queue = session
		})
		return () => {
			session.dispose()
			completion.cancel()
			queue = undefined
		}
	})
	function handleFilesAdded(files: File[]) {
		completion.cancel()
		queue?.add(files)
	}
	function removeFile(file: File) {
		completion.cancel()
		queue?.remove(file)
	}
	function clearAll() {
		completion.cancel()
		queue?.clear()
	}
	function handleClose() {
		completion.cancel()
		isOpen = false
		onClose()
	}
	async function uploadFiles() {
		const session = queue
		if (!session) return
		completion.cancel()
		if (await session.run()) {
			if (queue !== session) return
			completion.schedule(
				onUploadComplete,
				() => {
					if (queue === session) handleClose()
				},
				() => {
					if (queue === session)
						uploadState = {
							...uploadState,
							errors: ['Uploads saved, but the library could not refresh. Close and reload.']
						}
				}
			)
		}
	}
</script>

<Modal
	bind:isOpen
	onClose={handleClose}
	size="large"
	closeOnBackdrop={!isUploading}
	closeOnEscape={!isUploading}
>
	<div class="upload-modal-content">
		<div class="modal-header">
			<h2>Upload Media</h2>
		</div>
		<div class="modal-inner-content">
			<!-- File List (shown above drop zone when files are selected) -->
			{#if files.length > 0}
				<FilePreviewList
					{files}
					onRemoveFile={removeFile}
					progressFor={(file) =>
						uploadState.entries.find((entry) => entry.file === file)?.status === 'complete'
							? 100
							: 0}
					{uploadErrors}
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
				disabled={isUploading || files.length === successCount}
				loading={isUploading}
			>
				{isUploading
					? 'Uploading...'
					: files.length > 0
						? `Upload ${files.length - successCount} file${files.length - successCount !== 1 ? 's' : ''}`
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
	}

	// Responsive adjustments
	@media (max-width: 768px) {
		.upload-modal-content {
			max-height: 80vh;
		}
	}
</style>
