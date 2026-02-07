<script lang="ts">
	import ImageUploader from './ImageUploader.svelte'
	import Button from './Button.svelte'
	import type { ProjectFormData } from '$lib/types/project'
	import type { Media } from '@prisma/client'

	interface Props {
		formData: ProjectFormData
		onSave?: () => Promise<void>
	}

	let { formData = $bindable(), onSave }: Props = $props()

	// State for collapsible featured image section
	let showFeaturedImage = $state(
		!!formData.featuredImage && formData.featuredImage !== '' && formData.featuredImage !== null
	)

	// Convert featuredImage string to Media object for ImageUploader
	let featuredImageMedia = $state<Media | null>(null)

	// Initialize media object from existing featuredImage URL
	$effect(() => {
		if (
			formData.featuredImage &&
			formData.featuredImage !== '' &&
			formData.featuredImage !== null &&
			!featuredImageMedia
		) {
			// Only create a minimal Media object if we don't already have one
			featuredImageMedia = {
				id: -1, // Temporary ID for existing URLs
				filename: 'featured-image',
				originalName: 'featured-image',
				mimeType: 'image/jpeg',
				size: 0,
				url: formData.featuredImage,
				thumbnailUrl: formData.featuredImage,
				width: null,
				height: null,
				description: null,
				usedIn: [],
				createdAt: new Date(),
				updatedAt: new Date(),
				isPhotography: false,
				exifData: null,
				photoCaption: null,
				photoTitle: null,
				photoDescription: null,
				photoSlug: null,
				photoPublishedAt: null,
				dominantColor: null,
				colors: null,
				aspectRatio: null,
				duration: null,
				videoCodec: null,
				audioCodec: null,
				bitrate: null
			}
		}
	})

	// Sync featuredImageMedia changes back to formData
	$effect(() => {
		if (!featuredImageMedia && formData.featuredImage) {
			formData.featuredImage = ''
		}
	})

	function handleFeaturedImageUpload(media: Media) {
		formData.featuredImage = media.url
		featuredImageMedia = media
	}

	async function handleFeaturedImageRemove() {
		formData.featuredImage = ''
		featuredImageMedia = null
		showFeaturedImage = false

		// Auto-save the removal
		if (onSave) {
			await onSave()
		}
	}
</script>

<div class="form-section">
	<div class="section-header-with-action">
		<h2>Images</h2>
		{#if !showFeaturedImage}
			<Button
				variant="secondary"
				buttonSize="small"
				onclick={() => (showFeaturedImage = true)}
				iconPosition="left"
			>
				{#snippet icon()}<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
					<circle cx="8.5" cy="8.5" r="1.5"></circle>
					<polyline points="21 15 16 10 5 21"></polyline>
				</svg>{/snippet}
				Add Featured Image
			</Button>
		{/if}
	</div>

	{#if showFeaturedImage}
		<ImageUploader
			label=""
			bind:value={featuredImageMedia}
			onUpload={handleFeaturedImageUpload}
			onRemove={handleFeaturedImageRemove}
			placeholder="Upload a featured image for this project"
			showBrowseLibrary={true}
		/>
	{/if}
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
			margin: 0;
			color: $gray-10;
		}
	}

	.section-header-with-action {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: $unit-3x;
	}
</style>
