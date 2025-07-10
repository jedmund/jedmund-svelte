<script lang="ts">
	import GalleryUploader from './GalleryUploader.svelte'
	import type { ProjectFormData } from '$lib/types/project'
	import type { Media } from '@prisma/client'

	interface Props {
		formData: ProjectFormData
	}

	let { formData = $bindable() }: Props = $props()

	// Convert gallery array to Media objects for GalleryUploader
	let galleryMedia = $state<Media[]>([])

	// Update galleryMedia when gallery changes
	$effect(() => {
		if (formData.gallery && Array.isArray(formData.gallery)) {
			// Convert gallery URLs/objects to Media objects
			galleryMedia = formData.gallery.map((item, index) => {
				if (typeof item === 'string') {
					// Handle legacy URL strings
					return {
						id: -(index + 100), // Temporary negative IDs for URLs
						filename: `gallery-${index}.jpg`,
						originalName: `gallery-${index}.jpg`,
						mimeType: 'image/jpeg',
						size: 0,
						url: item,
						thumbnailUrl: item,
						width: null,
						height: null,
						altText: null,
						description: null,
						usedIn: [],
						createdAt: new Date(),
						updatedAt: new Date()
					}
				} else {
					// Already a Media object
					return item
				}
			})
		} else {
			galleryMedia = []
		}
	})

	function handleGalleryUpload(media: Media[]) {
		// Store as Media objects in the gallery field
		formData.gallery = media
		galleryMedia = media
	}

	function handleGalleryReorder(media: Media[]) {
		formData.gallery = media
		galleryMedia = media
	}
</script>

<div class="form-section">
	<h2>Project Gallery</h2>

	<GalleryUploader
		label="Gallery Images"
		value={galleryMedia}
		onUpload={handleGalleryUpload}
		onReorder={handleGalleryReorder}
		maxItems={12}
		allowAltText={true}
		maxFileSize={10}
		placeholder="Drag and drop images here to create a project gallery"
		helpText="Upload project screenshots, mockups, or other visual assets. You can reorder images by dragging them."
		showBrowseLibrary={true}
	/>
</div>

<style lang="scss">
	.form-section {
		margin-bottom: $unit-6x;

		&:last-child {
			margin-bottom: 0;
		}

		h2 {
			font-size: 1.25rem;
			font-weight: 600;
			margin: 0 0 $unit-3x;
			color: $gray-10;
		}
	}
</style>
