<script lang="ts">
	import { onMount } from 'svelte'
	import { goto } from '$app/navigation'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import AdminHeader from '$lib/components/admin/AdminHeader.svelte'
	import Button from '$lib/components/admin/Button.svelte'
	import Modal from '$lib/components/admin/Modal.svelte'
	import { formatBytes } from '$lib/utils/format'
	import { CheckCircle, Trash2, AlertCircle, RefreshCw } from 'lucide-svelte'
	import ChevronLeft from '$icons/chevron-left.svg'

	interface AuditSummary {
		totalCloudinaryFiles: number
		totalDatabaseReferences: number
		orphanedFilesCount: number
		orphanedFilesSize: number
		orphanedFilesSizeFormatted: string
		missingReferencesCount: number
	}

	interface OrphanedFile {
		publicId: string
		url: string
		folder: string
		format: string
		size: number
		sizeFormatted: string
		dimensions: { width: number; height: number } | null
		createdAt: string
	}

	let loading = true
	let deleting = false
	let auditData: {
		summary: AuditSummary
		orphanedFiles: OrphanedFile[]
		missingReferences: string[]
	} | null = null
	let error: string | null = null
	let selectedFiles = new Set<string>()
	let showDeleteModal = false
	let deleteResults: { succeeded: number; failed: string[] } | null = null
	let cleanupResults: { cleanedMedia: number; cleanedProjects: number; cleanedPosts: number; errors: string[] } | null = null
	let showCleanupModal = false
	let cleaningUp = false

	$: allSelected = auditData && selectedFiles.size >= Math.min(20, auditData.orphanedFiles.length)
	$: hasSelection = selectedFiles.size > 0
	$: selectedSize =
		auditData?.orphanedFiles
			.filter((f) => selectedFiles.has(f.publicId))
			.reduce((sum, f) => sum + f.size, 0) || 0
	
	$: console.log('Reactive state:', { hasSelection, selectedFilesSize: selectedFiles.size, deleting, showDeleteModal, showCleanupModal })

	onMount(() => {
		runAudit()
	})

	async function runAudit() {
		loading = true
		error = null
		selectedFiles.clear()

		try {
			const auth = localStorage.getItem('admin_auth')
			if (!auth) {
				error = 'Not authenticated'
				loading = false
				return
			}

			const response = await fetch('/api/admin/cloudinary-audit', {
				headers: {
					Authorization: `Basic ${auth}`
				}
			})
			if (!response.ok) {
				throw new Error('Failed to fetch audit data')
			}
			auditData = await response.json()
		} catch (err) {
			error = err instanceof Error ? err.message : 'An error occurred'
		} finally {
			loading = false
		}
	}

	function toggleSelectAll() {
		if (allSelected) {
			selectedFiles.clear()
		} else {
			// Select only the first 20 files
			const first20Files = auditData?.orphanedFiles.slice(0, 20).map((f) => f.publicId) || []
			selectedFiles = new Set(first20Files)
		}
	}

	function toggleFile(publicId: string) {
		console.log('toggleFile called', publicId)
		if (selectedFiles.has(publicId)) {
			selectedFiles.delete(publicId)
		} else {
			selectedFiles.add(publicId)
		}
		selectedFiles = selectedFiles // Trigger reactivity
		console.log('selectedFiles after toggle:', Array.from(selectedFiles))
	}

	async function deleteSelected(dryRun = true) {
		console.log('deleteSelected called', { dryRun, hasSelection, deleting, selectedFiles: Array.from(selectedFiles) })
		if (!hasSelection || deleting) return

		if (!dryRun) {
			showDeleteModal = false
		}

		deleting = true
		deleteResults = null

		try {
			const auth = localStorage.getItem('admin_auth')
			if (!auth) {
				error = 'Not authenticated'
				deleting = false
				return
			}

			const response = await fetch('/api/admin/cloudinary-audit', {
				method: 'DELETE',
				headers: { 
					'Content-Type': 'application/json',
					Authorization: `Basic ${auth}`
				},
				body: JSON.stringify({
					publicIds: Array.from(selectedFiles),
					dryRun
				})
			})

			if (!response.ok) {
				throw new Error('Failed to delete files')
			}

			const result = await response.json()

			if (!dryRun && result.results) {
				deleteResults = result.results
				// Refresh audit after successful deletion
				setTimeout(() => {
					runAudit()
				}, 2000)
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'An error occurred'
		} finally {
			deleting = false
		}
	}

	function formatDate(dateString: string) {
		const date = new Date(dateString)
		// Format: 01/05/24
		const month = (date.getMonth() + 1).toString().padStart(2, '0')
		const day = date.getDate().toString().padStart(2, '0')
		const year = date.getFullYear().toString().slice(-2)
		return `${month}/${day}/${year}`
	}

	async function cleanupBrokenReferences() {
		if (!auditData || auditData.missingReferences.length === 0 || cleaningUp) return

		showCleanupModal = false
		cleaningUp = true
		cleanupResults = null

		try {
			const auth = localStorage.getItem('admin_auth')
			if (!auth) {
				error = 'Not authenticated'
				cleaningUp = false
				return
			}

			const response = await fetch('/api/admin/cloudinary-audit', {
				method: 'PATCH',
				headers: { 
					'Content-Type': 'application/json',
					Authorization: `Basic ${auth}`
				},
				body: JSON.stringify({
					publicIds: auditData.missingReferences
				})
			})

			if (!response.ok) {
				throw new Error('Failed to clean up broken references')
			}

			const result = await response.json()
			cleanupResults = result.results

			// Refresh audit after successful cleanup
			setTimeout(() => {
				runAudit()
			}, 2000)
		} catch (err) {
			error = err instanceof Error ? err.message : 'An error occurred'
		} finally {
			cleaningUp = false
		}
	}
</script>

<svelte:head>
	<title>Media Audit - Admin @jedmund</title>
</svelte:head>

<AdminPage>
	<header slot="header">
		<div class="header-left">
			<button class="btn-icon" onclick={() => goto('/admin/media')}>
				<ChevronLeft />
			</button>
			<h1>Cloudinary Audit</h1>
		</div>
		<div class="header-actions">
			<Button
				variant="secondary"
				onclick={runAudit}
				disabled={loading}
				icon={RefreshCw}
				iconPosition="left"
			>
				{loading ? 'Running Audit...' : 'Run Audit'}
			</Button>
		</div>
	</header>

	{#if loading}
		<div class="loading">
			<div class="spinner"></div>
			<p>Analyzing Cloudinary storage...</p>
		</div>
	{:else if error}
		<div class="error">
			<AlertCircle size={24} />
			<p>{error}</p>
			<Button variant="secondary" size="small" onclick={runAudit}>Try Again</Button>
		</div>
	{:else if auditData}
		<!-- Summary Cards -->
		<div class="summary-grid">
			<div class="summary-card">
				<div class="card-content">
					<h3>Total Files</h3>
					<p class="value">{auditData.summary.totalCloudinaryFiles.toLocaleString()}</p>
					<p class="label">in Cloudinary</p>
				</div>
			</div>
			<div class="summary-card">
				<div class="card-content">
					<h3>Database References</h3>
					<p class="value">{auditData.summary.totalDatabaseReferences.toLocaleString()}</p>
					<p class="label">tracked files</p>
				</div>
			</div>
			<div class="summary-card warning">
				<div class="card-content">
					<h3>Orphaned Files</h3>
					<p class="value">{auditData.summary.orphanedFilesCount.toLocaleString()}</p>
					<p class="label">{auditData.summary.orphanedFilesSizeFormatted} wasted</p>
				</div>
			</div>
			<div class="summary-card {auditData.summary.missingReferencesCount > 0 ? 'error' : ''}">
				<div class="card-content">
					<h3>Missing Files</h3>
					<p class="value">{auditData.summary.missingReferencesCount.toLocaleString()}</p>
					<p class="label">broken references</p>
				</div>
			</div>
		</div>

		{#if auditData.orphanedFiles.length > 0}
			<!-- Actions Bar -->
			<div class="actions-bar">
				<div class="selection-info">
					{#if hasSelection}
						<span>{selectedFiles.size} files selected ({formatBytes(selectedSize)})</span>
					{:else}
						<span>{auditData.orphanedFiles.length} orphaned files found</span>
					{/if}
					{#if auditData.orphanedFiles.length > 20}
						<span class="limit-notice">(Max 20 at once)</span>
					{/if}
				</div>
				<div class="actions">
					<Button variant="text" buttonSize="small" onclick={toggleSelectAll}>
						{allSelected ? 'Deselect All' : 'Select 20'}
					</Button>
					<Button
						variant="danger"
						buttonSize="small"
						onclick={() => {
							console.log('Delete Selected clicked', { hasSelection, deleting, selectedFiles: Array.from(selectedFiles) })
							showDeleteModal = true
						}}
						disabled={!hasSelection || deleting}
						icon={Trash2}
						iconPosition="left"
					>
						Delete Selected
					</Button>
				</div>
			</div>

			<!-- Files Table -->
			<div class="files-table">
				<table>
					<thead>
						<tr>
							<th class="checkbox" title="Select first 20">
								<input type="checkbox" checked={allSelected} onchange={toggleSelectAll} />
							</th>
							<th>Preview</th>
							<th>File Path</th>
							<th>Size</th>
							<th>Dimensions</th>
							<th>Created</th>
						</tr>
					</thead>
					<tbody>
						{#each auditData.orphanedFiles as file}
							<tr 
								class:selected={selectedFiles.has(file.publicId)}
								onclick={() => toggleFile(file.publicId)}
								role="button"
								tabindex="0"
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault()
										toggleFile(file.publicId)
									}
								}}
							>
								<td class="checkbox">
									<input
										type="checkbox"
										checked={selectedFiles.has(file.publicId)}
										onchange={() => toggleFile(file.publicId)}
										onclick={(e) => e.stopPropagation()}
									/>
								</td>
								<td class="preview">
									{#if file.format === 'svg'}
										<div class="svg-preview">.svg</div>
									{:else}
										<img src={file.url} alt={file.publicId} />
									{/if}
								</td>
								<td class="file-path">
									<span class="folder">{file.folder}/</span>
									<span class="filename">{file.publicId.split('/').pop()}</span>
								</td>
								<td class="size">{file.sizeFormatted}</td>
								<td class="dimensions">
									{#if file.dimensions}
										{file.dimensions.width}×{file.dimensions.height}
									{:else}
										—
									{/if}
								</td>
								<td class="date">{formatDate(file.createdAt)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<!-- No orphaned files -->
			<div class="empty-state">
				<CheckCircle size={48} />
				<h2>All Clean!</h2>
				<p>No orphaned files found. Your Cloudinary storage is in sync with your database.</p>
			</div>
		{/if}

		{#if deleteResults}
			<div class="delete-results">
				<h3>Deletion Complete</h3>
				<p>✓ Successfully deleted {deleteResults.succeeded} files</p>
				{#if deleteResults.failed.length > 0}
					<p>✗ Failed to delete {deleteResults.failed.length} files</p>
				{/if}
			</div>
		{/if}

		{#if auditData.missingReferences.length > 0}
			<div class="broken-references-section">
				<h2>Broken References</h2>
				<p class="broken-references-info">
					Found {auditData.missingReferences.length} files referenced in the database but missing from Cloudinary.
				</p>
				<Button
					variant="secondary"
					buttonSize="small"
					onclick={() => {
						console.log('Clean Up Broken References clicked', { cleaningUp, missingReferencesCount: auditData?.missingReferences.length })
						showCleanupModal = true
					}}
					disabled={cleaningUp}
					icon={AlertCircle}
					iconPosition="left"
				>
					Clean Up Broken References
				</Button>
				
				{#if cleanupResults}
					<div class="cleanup-results">
						<h3>Cleanup Complete</h3>
						<p>✓ Cleaned {cleanupResults.cleanedMedia} media records</p>
						<p>✓ Cleaned {cleanupResults.cleanedProjects} project records</p>
						<p>✓ Cleaned {cleanupResults.cleanedPosts} post records</p>
						{#if cleanupResults.errors.length > 0}
							<p>✗ Errors: {cleanupResults.errors.join(', ')}</p>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</AdminPage>

<!-- Delete Confirmation Modal -->
<Modal bind:isOpen={showDeleteModal}>
	<div class="audit-modal-content">
		<div class="modal-header">
			<h2>Delete Orphaned Files</h2>
		</div>
		<div class="delete-confirmation">
			<p>Are you sure you want to delete {selectedFiles.size} orphaned files?</p>
			<p class="size-info">This will free up {formatBytes(selectedSize)} of storage.</p>
			<p class="warning">⚠️ This action cannot be undone.</p>
		</div>
		<div class="modal-actions">
			<Button variant="secondary" onclick={() => {
				console.log('Cancel clicked')
				showDeleteModal = false
			}}>Cancel</Button>
			<Button variant="danger" onclick={() => {
				console.log('Delete Files clicked')
				deleteSelected(false)
			}} disabled={deleting}>
				{deleting ? 'Deleting...' : 'Delete Files'}
			</Button>
		</div>
	</div>
</Modal>

<!-- Cleanup Confirmation Modal -->
<Modal bind:isOpen={showCleanupModal}>
	<div class="audit-modal-content">
		<div class="modal-header">
			<h2>Clean Up Broken References</h2>
		</div>
		<div class="cleanup-confirmation">
			<p>Are you sure you want to clean up {auditData?.missingReferences.length || 0} broken references?</p>
			<p class="warning">⚠️ This will remove Cloudinary URLs from database records where the files no longer exist.</p>
			<p>This action cannot be undone.</p>
		</div>
		<div class="modal-actions">
			<Button variant="secondary" onclick={() => {
				console.log('Cancel cleanup clicked')
				showCleanupModal = false
			}}>Cancel</Button>
			<Button variant="danger" onclick={() => {
				console.log('Clean Up References clicked')
				cleanupBrokenReferences()
			}} disabled={cleaningUp}>
				{cleaningUp ? 'Cleaning Up...' : 'Clean Up References'}
			</Button>
		</div>
	</div>
</Modal>

<style lang="scss">
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0;
		margin: 0;
		width: 100%;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: $unit-2x;

		h1 {
			margin: 0;
			font-size: 1.5rem;
			font-weight: 600;
			color: $grey-10;
		}
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: $unit-2x;
	}

	.btn-icon {
		width: 40px;
		height: 40px;
		border: none;
		background: none;
		color: $grey-40;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		transition: all 0.2s ease;

		:global(svg) {
			width: 20px;
			height: 20px;
			fill: none;
			stroke: currentColor;
			stroke-width: 2;
			stroke-linecap: round;
			stroke-linejoin: round;
		}

		&:hover {
			background: $grey-90;
			color: $grey-10;
		}
	}

	.loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 400px;
		gap: 1rem;

		.spinner {
			width: 40px;
			height: 40px;
			border: 3px solid $grey-80;
			border-top-color: $red-60;
			border-radius: 50%;
			animation: spin 1s linear infinite;
		}

		p {
			color: $grey-30;
		}
	}

	.error {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 400px;
		gap: 1rem;
		color: $red-60;

		p {
			font-size: 1.1rem;
		}
	}

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1.5rem;
		margin-bottom: 2rem;

		@media (max-width: 768px) {
			grid-template-columns: 1fr;
		}
	}

	.summary-card {
		background: $grey-95;
		border-radius: 8px;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 140px;

		.card-content {
			padding: 1.5rem;
			text-align: center;
			width: 100%;
		}

		h3 {
			font-size: 0.875rem;
			font-weight: 500;
			color: $grey-30;
			margin: 0 0 0.75rem 0;
			letter-spacing: 0.01em;
			text-transform: uppercase;
		}

		.value {
			font-size: 2.5rem;
			font-weight: 600;
			color: $grey-10;
			margin: 0 0 0.5rem 0;
			line-height: 1;
			display: block;
		}

		.label {
			font-size: 0.875rem;
			color: $grey-40;
			margin: 0;
			line-height: 1.2;
			display: block;
		}

		&.warning {
			background: rgba($yellow-60, 0.1);

			.value {
				color: $yellow-60;
			}
		}

		&.error {
			background: rgba($red-60, 0.1);

			.value {
				color: $red-60;
			}
		}
	}

	.actions-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: $grey-95;
		border-radius: 8px;
		margin-bottom: 1rem;

		.selection-info {
			color: $grey-30;
			font-size: 0.875rem;
			display: flex;
			align-items: center;
			gap: 0.5rem;

			.limit-notice {
				color: $yellow-60;
				font-size: 0.8125rem;
			}
		}

		.actions {
			display: flex;
			gap: 0.5rem;
		}
	}

	.files-table {
		background: white;
		border: 1px solid $grey-90;
		border-radius: 8px;
		overflow: hidden;

		table {
			width: 100%;
			border-collapse: collapse;

			th {
				text-align: left;
				padding: 0.75rem 1rem;
				font-size: 0.875rem;
				font-weight: 500;
				color: $grey-30;
				background: $grey-95;
				border-bottom: 1px solid $grey-90;

				&.checkbox {
					width: 40px;
				}
			}

			td {
				padding: 0.75rem 1rem;
				border-bottom: 1px solid $grey-95;
				vertical-align: middle;

				&.checkbox {
					width: 40px;
					vertical-align: middle;
				}

				&.preview {
					width: 60px;
					vertical-align: middle;

					img {
						width: 40px;
						height: 40px;
						object-fit: cover;
						border-radius: 4px;
						display: block;
					}

					.svg-preview {
						width: 40px;
						height: 40px;
						background: $grey-90;
						border-radius: 4px;
						display: flex;
						align-items: center;
						justify-content: center;
						font-size: 0.75rem;
						color: $grey-40;
					}
				}

				&.file-path {
					.folder {
						color: $grey-40;
					}
				}

				&.size {
					color: $grey-30;
					font-size: 0.875rem;
				}

				&.dimensions {
					color: $grey-30;
					font-size: 0.875rem;
				}

				&.date {
					color: $grey-30;
					font-size: 0.875rem;
					vertical-align: middle;
					white-space: nowrap;
				}
			}

			tr {
				cursor: pointer;
				transition: background-color 0.15s ease;

				&:hover {
					background: $grey-95;
				}

				&.selected {
					background: rgba($red-60, 0.05);

					&:hover {
						background: rgba($red-60, 0.08);
					}
				}

				&:focus {
					outline: 2px solid rgba($blue-60, 0.5);
					outline-offset: -2px;
				}
			}
		}
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 400px;
		text-align: center;
		color: $blue-60;

		h2 {
			margin: 1rem 0 0.5rem;
			color: $grey-10;
		}

		p {
			color: $grey-30;
			max-width: 400px;
		}
	}

	.delete-confirmation {
		padding: 1rem 0;

		p {
			margin: 0.5rem 0;
		}

		.size-info {
			color: $grey-30;
			font-size: 0.875rem;
		}

		.warning {
			color: $yellow-60;
			font-weight: 500;
			margin-top: 1rem;
		}
	}

	.delete-results {
		margin-top: 1rem;
		padding: 1rem;
		background: rgba($blue-60, 0.1);
		border-radius: 8px;
		text-align: center;

		h3 {
			margin: 0 0 0.5rem;
			color: $blue-60;
		}

		p {
			margin: 0.25rem 0;
			color: $grey-30;
		}
	}

	.broken-references-section {
		margin-top: 2rem;
		padding: 1.5rem;
		background: $grey-95;
		border-radius: 8px;
		border: 1px solid rgba($yellow-60, 0.2);

		h2 {
			margin: 0 0 0.5rem;
			font-size: 1.25rem;
			color: $grey-10;
		}

		.broken-references-info {
			margin: 0 0 1rem;
			color: $grey-30;
		}
	}

	.cleanup-results {
		margin-top: 1rem;
		padding: 1rem;
		background: rgba($blue-60, 0.1);
		border-radius: 8px;

		h3 {
			margin: 0 0 0.5rem;
			color: $blue-60;
			font-size: 1rem;
		}

		p {
			margin: 0.25rem 0;
			color: $grey-30;
			font-size: 0.875rem;
		}
	}

	.cleanup-confirmation {
		padding: 1rem 0;

		p {
			margin: 0.5rem 0;
		}

		.warning {
			color: $yellow-60;
			font-weight: 500;
			margin: 1rem 0;
		}
	}

	.modal-header {
		margin-bottom: 1rem;

		h2 {
			margin: 0;
			font-size: 1.25rem;
			font-weight: 600;
			color: $grey-10;
		}
	}

	.audit-modal-content {
		display: flex;
		flex-direction: column;
		padding: 1.5rem;
		min-width: 400px;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid $grey-90;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
