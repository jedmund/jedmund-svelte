<script lang="ts">
	import Input from './Input.svelte'
	import ImageUploader from './ImageUploader.svelte'
	import type { ProjectFormData } from '$lib/types/project'
	import type { Media } from '@prisma/client'

	interface Props {
		formData: ProjectFormData
	}

	let { formData = $bindable() }: Props = $props()
	
	// Convert logoUrl string to Media object for ImageUploader
	let logoMedia = $state<Media | null>(null)
	
	// Update logoMedia when logoUrl changes
	$effect(() => {
		if (formData.logoUrl && !logoMedia) {
			// Create a minimal Media object from the URL for display
			logoMedia = {
				id: -1, // Temporary ID for existing URLs
				filename: 'logo.svg',
				originalName: 'logo.svg',
				mimeType: 'image/svg+xml',
				size: 0,
				url: formData.logoUrl,
				thumbnailUrl: formData.logoUrl,
				width: null,
				height: null,
				altText: null,
				description: null,
				usedIn: [],
				createdAt: new Date(),
				updatedAt: new Date()
			}
		} else if (!formData.logoUrl) {
			logoMedia = null
		}
	})
	
	function handleLogoUpload(media: Media) {
		formData.logoUrl = media.url
		logoMedia = media
	}
	
	function handleLogoRemove() {
		formData.logoUrl = ''
		logoMedia = null
	}
</script>

<div class="form-section">
	<h2>Branding</h2>

	<ImageUploader
		label="Project Logo"
		value={logoMedia}
		onUpload={handleLogoUpload}
		aspectRatio="1:1"
		allowAltText={true}
		maxFileSize={0.5}
		placeholder="Drag and drop an SVG logo here, or click to browse"
		helpText="Upload an SVG logo for project thumbnail (max 500KB). Square logos work best."
		showBrowseLibrary={true}
		compact={true}
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
			color: $grey-10;
		}
	}
</style>
