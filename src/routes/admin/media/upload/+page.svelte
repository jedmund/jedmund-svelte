<script lang="ts">
	import { onDestroy } from 'svelte'
	import { goto } from '$app/navigation'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import Button from '$lib/components/admin/Button.svelte'
	import FileUploadZone from '$lib/components/admin/FileUploadZone.svelte'
	import FilePreviewList from '$lib/components/admin/FilePreviewList.svelte'
	import { createUploadQueue, emptyUploadQueue } from '$lib/admin/media/upload-queue'
	let queueState = $state.raw(emptyUploadQueue())
	let navigationError = $state('')
	const queue = createUploadQueue({ onChange: (value) => (queueState = value) })
	const files = $derived(queueState.entries.map((entry) => entry.file))
	const successCount = $derived(
		queueState.entries.filter((entry) => entry.status === 'complete').length
	)
	let redirectTimer: ReturnType<typeof setTimeout> | undefined
	let disposed = false
	onDestroy(() => {
		disposed = true
		clearTimeout(redirectTimer)
		queue.dispose()
	})
	async function uploadFiles() {
		clearTimeout(redirectTimer)
		if ((await queue.run()) && !disposed)
			redirectTimer = setTimeout(() => {
				goto('/admin/media').catch(
					() =>
						(navigationError = 'Uploads saved. Return to the media library using the link above.')
				)
			}, 1500)
	}
	function addFiles(files: File[]) {
		clearTimeout(redirectTimer)
		queue.add(files)
	}
</script>

<svelte:head><title>Upload Media - Admin @jedmund</title></svelte:head>
<AdminPage>
	{#snippet header()}
		<header>
			<h1>Upload Media</h1>
			<div class="header-actions">
				<Button variant="secondary" href="/admin/media">← Back to Media Library</Button>
			</div>
		</header>
	{/snippet}
	<div class="upload-container">
		{#if files.length}
			<div class="file-list-header">
				<h3>Files to Upload</h3>
				<div class="file-actions">
					<Button
						buttonSize="small"
						onclick={uploadFiles}
						disabled={queueState.running || successCount === files.length}
						loading={queueState.running}
					>
						{queueState.running
							? 'Uploading...'
							: `Upload ${files.length - successCount} File${files.length - successCount === 1 ? '' : 's'}`}
					</Button>
					<Button
						variant="ghost"
						buttonSize="small"
						onclick={() => {
							clearTimeout(redirectTimer)
							queue.clear()
						}}
						disabled={queueState.running}>Clear all files</Button
					>
				</div>
			</div>
			<FilePreviewList
				{files}
				onRemoveFile={(file) => {
					clearTimeout(redirectTimer)
					queue.remove(file)
				}}
				isUploading={queueState.running}
				progressFor={(file) =>
					queueState.entries.find((entry) => entry.file === file)?.status === 'complete' ? 100 : 0}
				uploadErrors={queueState.errors}
			/>
		{/if}
		<FileUploadZone
			onFilesAdded={addFiles}
			accept={['image/*', 'video/*']}
			compact={files.length > 0}
			disabled={queueState.running}
		/>
		{#if successCount}<div class="success-message">
				Successfully uploaded {successCount} file{successCount === 1 ? '' : 's'}.
			</div>{/if}
		{#if navigationError}<p role="alert">{navigationError}</p>{/if}
	</div>
</AdminPage>

<style lang="scss">
	.header-actions {
		display: flex;
		gap: $unit-2x;
	}
	.upload-container {
		max-width: 800px;
		margin: 0 auto;
		padding: $unit-4x;
	}
	.success-message {
		color: #16a34a;
		margin-bottom: $unit-2x;
	}

	.file-list-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: $unit-2x;
	}
	.file-actions {
		display: flex;
		gap: $unit;
	}
	@media (max-width: 640px) {
		.file-list-header {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
