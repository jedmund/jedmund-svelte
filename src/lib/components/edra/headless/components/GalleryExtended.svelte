<script lang="ts">
	import { NodeViewWrapper } from 'svelte-tiptap'
	import type { NodeViewProps } from '@tiptap/core'
	import tippy, { type Instance } from 'tippy.js'
	import 'tippy.js/dist/tippy.css'
	import Grid from '@lucide/svelte/icons/grid-3x3'
	import Columns from '@lucide/svelte/icons/columns'
	import RectangleVertical from '@lucide/svelte/icons/rectangle-vertical'
	import Columns2 from '@lucide/svelte/icons/columns-2'
	import Columns3 from '@lucide/svelte/icons/columns-3'
	import Trash from '@lucide/svelte/icons/trash'
	import Edit from '@lucide/svelte/icons/edit'
	import Plus from '@lucide/svelte/icons/plus'
	import UnifiedMediaModal from '../../../admin/UnifiedMediaModal.svelte'
	import type { Media } from '@prisma/client'

	const { node, editor, selected, deleteNode, updateAttributes }: NodeViewProps = $props()

	let isMediaLibraryOpen = $state(false)
	let editingMode = $state(false)

	// Hover toolbar (same pattern as MediaExtended) — controls must never sit
	// in the content flow since they don't exist on the published page
	let groupRef = $state<HTMLElement>()
	let toolbarRef = $state<HTMLElement>()
	let tippyInstance: Instance | undefined

	$effect(() => {
		if (!groupRef || !toolbarRef || !editor?.isEditable) {
			tippyInstance?.destroy()
			tippyInstance = undefined
			return
		}

		tippyInstance = tippy(groupRef, {
			content: toolbarRef,
			interactive: true,
			trigger: 'mouseenter',
			placement: 'top-end',
			appendTo: () => document.body,
			arrow: false,
			theme: 'media-toolbar',
			delay: [100, 300],
			offset: [0, 8],
			interactiveBorder: 20,
			zIndex: 200,
			popperOptions: {
				modifiers: [
					{
						name: 'preventOverflow',
						options: { boundary: 'viewport', padding: 8 }
					},
					{
						name: 'flip',
						options: {
							fallbackPlacements: ['bottom-end', 'top-start', 'bottom-start']
						}
					}
				]
			}
		})

		return () => {
			tippyInstance?.destroy()
			tippyInstance = undefined
		}
	})

	$effect(() => {
		if (selected && tippyInstance) tippyInstance.show()
	})

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
		const newImages = mediaArray.map((m) => ({
			id: m.id,
			url: m.url,
			alt: m.description || '',
			title: m.description || ''
		}))

		if (editingMode) {
			// Replace all images
			updateAttributes({ images: newImages })
		} else {
			// Add to existing images
			const existingImages = (node.attrs.images || []) as Array<{
				id: number
				[key: string]: unknown
			}>
			const currentIds = existingImages.map((img) => img.id)
			const uniqueNewImages = newImages.filter((img) => !currentIds.includes(img.id))
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
		const currentImages = (node.attrs.images || []) as Array<{ id: number; [key: string]: unknown }>
		const updatedImages = currentImages.filter((img) => img.id !== imageId)
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
	<div bind:this={groupRef} class="edra-gallery-content">
		{#if images.length === 0}
			<div class="edra-gallery-empty">
				<Grid class="edra-gallery-empty-icon" />
				<span>Gallery is empty</span>
			</div>
		{:else}
			<div class={`edra-gallery-grid ${layout === 'masonry' ? 'masonry' : 'grid'}`}>
				{#each images as image}
					<div class="edra-gallery-item">
						<img src={image.url} alt={image.alt} title={image.title} loading="lazy" />
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
			<div bind:this={toolbarRef} class="edra-media-toolbar">
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
				<div class="edra-toolbar-divider"></div>
				<button
					class={`edra-toolbar-button ${columns === 1 ? 'active' : ''}`}
					onclick={() => changeColumns(1)}
					title="1 column"
				>
					<RectangleVertical />
				</button>
				<button
					class={`edra-toolbar-button ${columns === 2 ? 'active' : ''}`}
					onclick={() => changeColumns(2)}
					title="2 columns"
				>
					<Columns2 />
				</button>
				<button
					class={`edra-toolbar-button ${columns === 3 ? 'active' : ''}`}
					onclick={() => changeColumns(3)}
					title="3 columns"
				>
					<Columns3 />
				</button>
				<div class="edra-toolbar-divider"></div>
				<button class="edra-toolbar-button" onclick={handleAddImages} title="Add Images">
					<Plus />
				</button>
				<button class="edra-toolbar-button" onclick={handleEditGallery} title="Edit Gallery">
					<Edit />
				</button>
				<div class="edra-toolbar-divider"></div>
				<button
					class="edra-toolbar-button edra-destructive"
					onclick={() => deleteNode()}
					title="Delete Gallery"
				>
					<Trash />
				</button>
			</div>
		{/if}
	</div>

	<!-- Media Library Modal -->
	<UnifiedMediaModal
		bind:isOpen={isMediaLibraryOpen}
		mode="multiple"
		fileType="image"
		onSelect={handleMediaSelect}
		onClose={handleMediaLibraryClose}
	/>
</NodeViewWrapper>

<style lang="scss">
	.edra-gallery-container {
		border: $unit-2px solid transparent;
		border-radius: $corner-radius-md;
		margin: $unit-2x 0;
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
		gap: $unit;
		padding: $unit-4x;
		color: #6b7280;
		background: #f9fafb;
		border: $unit-2px dashed #e5e7eb;
		border-radius: $corner-radius-md;
	}

	:global(.edra-gallery-empty-icon) {
		width: $unit-4x;
		height: $unit-4x;
	}

	.edra-gallery-grid {
		display: grid;
		gap: $unit;
		border-radius: $corner-radius-md;
		overflow: hidden;
	}

	.edra-gallery-grid.grid {
		grid-template-columns: repeat(var(--columns), 1fr);
	}

	// In grid view, cells share a row height — fill them edge to edge like the
	// published page does (object-fit: cover), cropping centered rather than
	// letterboxing shorter images
	.edra-gallery-grid.grid .edra-gallery-item img {
		height: 100%;
		object-fit: cover;
	}

	.edra-gallery-grid.masonry {
		// column-count needs block layout; the base class is display: grid
		display: block;
		column-count: var(--columns);
		column-gap: $unit;
	}

	.edra-gallery-item {
		position: relative;
		background: #f3f4f6;
		border-radius: $corner-radius-sm;
		overflow: hidden;
		break-inside: avoid;
		margin-bottom: $unit;
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
		top: $unit-half;
		right: $unit-half;
		width: $unit-3x;
		height: $unit-3x;
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
		width: $unit-12px;
		height: $unit-12px;
	}

	:global(.edra-toolbar-button) {
		display: flex;
		align-items: center;
		justify-content: center;
		width: $unit-3x + $unit-half;
		height: $unit-3x + $unit-half;
		border: none;
		border-radius: $corner-radius-xs;
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
		width: $unit-2x;
		height: $unit-2x;
	}

	@media (max-width: 768px) {
		.edra-gallery-grid.grid {
			grid-template-columns: repeat(min(var(--columns), 2), 1fr);
		}

		.edra-gallery-grid.masonry {
			column-count: min(var(--columns), 2);
		}
	}
</style>
