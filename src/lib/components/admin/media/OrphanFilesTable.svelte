<script lang="ts">
	import type { createAuditController } from '$lib/admin/media/audit-controller.svelte'
	let {
		auditData,
		selectedFiles,
		allSelected,
		toggleSelectAll,
		toggleFile
	}: {
		auditData: ReturnType<typeof createAuditController>['auditData']
		selectedFiles: ReturnType<typeof createAuditController>['selectedFiles']
		allSelected: ReturnType<typeof createAuditController>['allSelected']
		toggleSelectAll: ReturnType<typeof createAuditController>['toggleSelectAll']
		toggleFile: ReturnType<typeof createAuditController>['toggleFile']
	} = $props()
	function formatDate(dateString: string) {
		const date = new Date(dateString)
		// Format: 01/05/24
		const month = (date.getMonth() + 1).toString().padStart(2, '0')
		const day = date.getDate().toString().padStart(2, '0')
		const year = date.getFullYear().toString().slice(-2)
		return `${month}/${day}/${year}`
	}
</script>

{#if auditData}
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
{/if}

<style lang="scss">
	.files-table {
		background: white;
		border: 1px solid $gray-90;
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
				color: $gray-30;
				background: $gray-95;
				border-bottom: 1px solid $gray-90;

				&.checkbox {
					width: 40px;
				}
			}

			td {
				padding: 0.75rem 1rem;
				border-bottom: 1px solid $gray-95;
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
						background: $gray-90;
						border-radius: 4px;
						display: flex;
						align-items: center;
						justify-content: center;
						font-size: 0.75rem;
						color: $gray-40;
					}
				}

				&.file-path {
					.folder {
						color: $gray-40;
					}
				}

				&.size {
					color: $gray-30;
					font-size: 0.875rem;
				}

				&.dimensions {
					color: $gray-30;
					font-size: 0.875rem;
				}

				&.date {
					color: $gray-30;
					font-size: 0.875rem;
					vertical-align: middle;
					white-space: nowrap;
				}
			}

			tr {
				cursor: pointer;
				transition: background-color 0.15s ease;

				&:hover {
					background: $gray-95;
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
</style>
