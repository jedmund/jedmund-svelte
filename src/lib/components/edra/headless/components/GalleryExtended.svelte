<script lang="ts">
	import { NodeViewWrapper } from 'svelte-tiptap'
	import type { NodeViewProps } from '@tiptap/core'
	import Grid from 'lucide-svelte/icons/grid-3x3'
	import Columns from 'lucide-svelte/icons/columns'
	import Trash from 'lucide-svelte/icons/trash'
	import Edit from 'lucide-svelte/icons/edit'
	import Plus from 'lucide-svelte/icons/plus'
	import MediaLibraryModal from '../../../admin/MediaLibraryModal.svelte'
	import type { Media } from '@prisma/client'

	const { node, editor, selected, deleteNode, updateAttributes }: NodeViewProps = $props()

	let isMediaLibraryOpen = $state(false)
	let editingMode = $state(false)

	function handleEditGallery() {
		editingMode = true
		isMediaLibraryOpen = true
	}

	function handleAddImages() {
		editingMode = false
		isMediaLibraryOpen = true
	}

	function handleMediaSelect(media: Media | Media[]) {
		const mediaArray = Array.isArray(media) ? media : [media]
		const newImages = mediaArray.map(m => ({
			id: m.id,
			url: m.url,
			alt: m.altText || '',
			title: m.description || ''
		}))

		if (editingMode) {
			// Replace all images
			updateAttributes({ images: newImages })
		} else {
			// Add to existing images
			const existingImages = node.attrs.images || []
			const currentIds = existingImages.map((img: any) => img.id)
			const uniqueNewImages = newImages.filter(img => !currentIds.includes(img.id))
			updateAttributes({ images: [...existingImages, ...uniqueNewImages] })
		}

		isMediaLibraryOpen = false
		editingMode = false
	}

	function handleMediaLibraryClose() {
		isMediaLibraryOpen = false
		editingMode = false
	}

	function removeImage(imageId: number) {
		const currentImages = node.attrs.images || []
		const updatedImages = currentImages.filter((img: any) => img.id !== imageId)
		updateAttributes({ images: updatedImages })
	}

	function changeLayout(layout: 'grid' | 'masonry') {
		updateAttributes({ layout })
	}

	function changeColumns(columns: number) {
		updateAttributes({ columns })
	}

	const images = $derived(node.attrs.images || [])
	const layout = $derived(node.attrs.layout || 'grid')
	const columns = $derived(node.attrs.columns || 3)
</script>

<NodeViewWrapper
	class={`edra-gallery-container ${selected ? 'selected' : ''}`}
	data-layout={layout}
	style={`--columns: ${columns}`}
>
	<div class="edra-gallery-content">
		{#if images.length === 0}
			<div class="edra-gallery-empty">
				<Grid class="edra-gallery-empty-icon" />
				<span>Gallery is empty</span>
			</div>
		{:else}
			<div class={`edra-gallery-grid ${layout === 'masonry' ? 'masonry' : 'grid'}`}>
				{#each images as image}
					<div class="edra-gallery-item">
						<img
							src={image.url}
							alt={image.alt}
							title={image.title}
							loading="lazy"
						/>
						{#if editor?.isEditable}
							<button
								class="edra-gallery-item-remove"
								onclick={() => removeImage(image.id)}
								title="Remove image"
							>
								<Trash />
							</button>
						{/if}
					</div>
				{/each}
			</div>
		{/if}

		{#if editor?.isEditable}
			<div class="edra-gallery-toolbar">
				<div class="edra-gallery-toolbar-section">
					<button
						class={`edra-toolbar-button ${layout === 'grid' ? 'active' : ''}`}
						onclick={() => changeLayout('grid')}
						title="Grid Layout"
					>
						<Grid />
					</button>
					<button
						class={`edra-toolbar-button ${layout === 'masonry' ? 'active' : ''}`}
						onclick={() => changeLayout('masonry')}
						title="Masonry Layout"
					>
						<Columns />
					</button>
				</div>
				
				<div class="edra-gallery-toolbar-section">
					<select
						class="edra-gallery-columns-select"
						value={columns}
						onchange={(e) => changeColumns(parseInt(e.currentTarget.value))}
						title="Columns"
					>
						<option value="2">2 cols</option>
						<option value="3">3 cols</option>
						<option value="4">4 cols</option>
						<option value="5">5 cols</option>
					</select>
				</div>

				<div class="edra-gallery-toolbar-section">
					<button
						class="edra-toolbar-button"
						onclick={handleAddImages}
						title="Add Images"
					>
						<Plus />
					</button>
					<button
						class="edra-toolbar-button"
						onclick={handleEditGallery}
						title="Edit Gallery"
					>
						<Edit />
					</button>
					<button
						class="edra-toolbar-button edra-destructive"
						onclick={() => deleteNode()}
						title="Delete Gallery"
					>
						<Trash />
					</button>
				</div>
			</div>
		{/if}
	</div>

	<!-- Media Library Modal -->
	<MediaLibraryModal
		bind:isOpen={isMediaLibraryOpen}
		mode="multiple"
		fileType="image"
		onSelect={handleMediaSelect}
		onClose={handleMediaLibraryClose}
	/>
</NodeViewWrapper>

<style>
	.edra-gallery-container {
		border: 2px solid transparent;
		border-radius: 8px;
		margin: 16px 0;
		transition: border-color 0.2s ease;
	}

	.edra-gallery-container.selected {
		border-color: #3b82f6;
	}

	.edra-gallery-content {
		position: relative;
	}

	.edra-gallery-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 32px;
		color: #6b7280;
		background: #f9fafb;
		border: 2px dashed #e5e7eb;
		border-radius: 8px;
	}

	:global(.edra-gallery-empty-icon) {
		width: 32px;
		height: 32px;
	}

	.edra-gallery-grid {
		display: grid;
		gap: 8px;
		border-radius: 8px;
		overflow: hidden;
	}

	.edra-gallery-grid.grid {
		grid-template-columns: repeat(var(--columns), 1fr);
	}

	.edra-gallery-grid.masonry {
		column-count: var(--columns);
		column-gap: 8px;
	}

	.edra-gallery-item {
		position: relative;
		background: #f3f4f6;
		border-radius: 6px;
		overflow: hidden;
		break-inside: avoid;
		margin-bottom: 8px;
	}

	.edra-gallery-item img {
		width: 100%;
		height: auto;
		display: block;
		transition: transform 0.2s ease;
	}

	.edra-gallery-item:hover img {
		transform: scale(1.02);
	}

	.edra-gallery-item-remove {
		position: absolute;
		top: 4px;
		right: 4px;
		width: 24px;
		height: 24px;
		border: none;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.7);
		color: white;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		transition: opacity 0.2s ease;
	}

	.edra-gallery-item:hover .edra-gallery-item-remove {
		opacity: 1;
	}

	.edra-gallery-item-remove:hover {
		background: rgba(239, 68, 68, 0.8);
	}

	:global(.edra-gallery-item-remove svg) {
		width: 12px;
		height: 12px;
	}

	.edra-gallery-toolbar {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 8px;
		background: rgba(255, 255, 255, 0.95);
		border: 1px solid #e5e7eb;
		border-radius: 6px;
		margin-top: 8px;
		backdrop-filter: blur(4px);
	}

	.edra-gallery-toolbar-section {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.edra-gallery-columns-select {
		padding: 4px 8px;
		border: 1px solid #e5e7eb;
		border-radius: 4px;
		background: white;
		font-size: 12px;
		cursor: pointer;
	}

	.edra-gallery-columns-select:focus {
		outline: none;
		border-color: #3b82f6;
	}

	:global(.edra-toolbar-button) {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border: none;
		border-radius: 4px;
		background: transparent;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	:global(.edra-toolbar-button:hover) {
		background: #f3f4f6;
	}

	:global(.edra-toolbar-button.active) {
		background: #3b82f6;
		color: white;
	}

	:global(.edra-toolbar-button.edra-destructive:hover) {
		background: #fef2f2;
		color: #dc2626;
	}

	:global(.edra-toolbar-button svg) {
		width: 16px;
		height: 16px;
	}

	@media (max-width: 768px) {
		.edra-gallery-grid.grid {
			grid-template-columns: repeat(2, 1fr);
		}
		
		.edra-gallery-grid.masonry {
			column-count: 2;
		}
	}
</style>