<script lang="ts">
	import Input from './Input.svelte'
	import ImageUploader from './ImageUploader.svelte'
	import BrandingSection from './BrandingSection.svelte'
	import ProjectBrandingPreview from './ProjectBrandingPreview.svelte'
	import type { ProjectFormData } from '$lib/types/project'
	import type { Media } from '@prisma/client'

	interface Props {
		formData: ProjectFormData
		validationErrors: Record<string, string>
	}

	let { formData = $bindable(), validationErrors }: Props = $props()

	// ===== Media State Management =====
	// Convert logoUrl string to Media object for ImageUploader
	let logoMedia = $state<Media | null>(null)
	let featuredImageMedia = $state<Media | null>(null)

	// Helper function to create Media object from URL
	function createMediaFromUrl(url: string, filename: string, mimeType: string): Media {
		return {
			id: -1, // Temporary ID for existing URLs
			filename,
			originalName: filename,
			mimeType,
			size: 0,
			url,
			thumbnailUrl: url,
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

	// Initialize Media objects from existing URLs
	$effect(() => {
		if (formData.logoUrl && formData.logoUrl.trim() !== '' && !logoMedia) {
			logoMedia = createMediaFromUrl(formData.logoUrl, 'logo.svg', 'image/svg+xml')
		}
		if (
			formData.featuredImage &&
			formData.featuredImage !== '' &&
			formData.featuredImage !== null &&
			!featuredImageMedia
		) {
			featuredImageMedia = createMediaFromUrl(
				formData.featuredImage,
				'featured-image',
				'image/jpeg'
			)
		}
	})

	// Sync Media objects back to formData URLs
	$effect(() => {
		if (!logoMedia && formData.logoUrl) formData.logoUrl = ''
		if (!featuredImageMedia && formData.featuredImage) formData.featuredImage = ''
	})

	// ===== Derived Toggle States =====
	const hasFeaturedImage = $derived(
		!!(formData.featuredImage && featuredImageMedia) || !!featuredImageMedia
	)
	const hasBackgroundColor = $derived(!!(formData.backgroundColor && formData.backgroundColor?.trim()))
	const hasLogo = $derived(!!(formData.logoUrl && logoMedia) || !!logoMedia)

	// Auto-disable toggles when content is removed
	$effect(() => {
		if (!hasFeaturedImage) formData.showFeaturedImageInHeader = false
		if (!hasBackgroundColor) formData.showBackgroundColorInHeader = false
		if (!hasLogo) formData.showLogoInHeader = false
	})

	// Track previous toggle states to detect which one changed
	let prevShowFeaturedImage: boolean | null = $state(null)
	let prevShowBackgroundColor: boolean | null = $state(null)

	// Mutual exclusion: only one of featured image or background color can be active
	$effect(() => {
		// On first run (initial load), if both are true, default to featured image taking priority
		if (prevShowFeaturedImage === null && prevShowBackgroundColor === null) {
			if (formData.showFeaturedImageInHeader && formData.showBackgroundColorInHeader) {
				formData.showBackgroundColorInHeader = false
			}
			prevShowFeaturedImage = formData.showFeaturedImageInHeader
			prevShowBackgroundColor = formData.showBackgroundColorInHeader
			return
		}

		const featuredChanged = formData.showFeaturedImageInHeader !== prevShowFeaturedImage
		const bgColorChanged = formData.showBackgroundColorInHeader !== prevShowBackgroundColor

		if (featuredChanged && formData.showFeaturedImageInHeader && formData.showBackgroundColorInHeader) {
			// Featured image was just turned ON while background color was already ON
			formData.showBackgroundColorInHeader = false
		} else if (bgColorChanged && formData.showBackgroundColorInHeader && formData.showFeaturedImageInHeader) {
			// Background color was just turned ON while featured image was already ON
			formData.showFeaturedImageInHeader = false
		}

		// Update previous values
		prevShowFeaturedImage = formData.showFeaturedImageInHeader
		prevShowBackgroundColor = formData.showBackgroundColorInHeader
	})

	// ===== Upload Handlers =====
	function handleFeaturedImageUpload(media: Media) {
		formData.featuredImage = media.url
		featuredImageMedia = media
	}

	function handleFeaturedImageRemove() {
		formData.featuredImage = ''
		featuredImageMedia = null
	}

	function handleLogoUpload(media: Media) {
		formData.logoUrl = media.url
		logoMedia = media
	}

	function handleLogoRemove() {
		formData.logoUrl = ''
		logoMedia = null
	}
</script>

<section class="branding-form">
	<!-- 0. Preview (unlabeled, at top) -->
	<ProjectBrandingPreview
		featuredImage={formData.featuredImage}
		backgroundColor={formData.backgroundColor}
		logoUrl={formData.logoUrl}
		showFeaturedImage={formData.showFeaturedImageInHeader}
		showBackgroundColor={formData.showBackgroundColorInHeader}
		showLogo={formData.showLogoInHeader}
	/>

	<!-- 1. Project Logo Section -->
	<BrandingSection
		title="Project logo"
		bind:toggleChecked={formData.showLogoInHeader}
		toggleDisabled={!hasLogo}
	>
		{#snippet children()}
			<ImageUploader
				label=""
				bind:value={logoMedia}
				onUpload={handleLogoUpload}
				onRemove={handleLogoRemove}
				aspectRatio="1:1"
				allowAltText={true}
				maxFileSize={0.5}
				placeholder="Drag and drop an SVG logo here, or click to browse"
				helpText="Upload an SVG logo for project thumbnail (max 500KB). Square logos work best."
				showBrowseLibrary={true}
				compact={true}
			/>
		{/snippet}
	</BrandingSection>

	<!-- 2. Accent Color Section -->
	<BrandingSection title="Accent Color" showToggle={false}>
		{#snippet children()}
			<Input
				type="text"
				bind:value={formData.highlightColor}
				label="Highlight Color"
				helpText="Accent color used for buttons and emphasis"
				error={validationErrors.highlightColor}
				placeholder="#000000"
				pattern="^#[0-9A-Fa-f]{6}$"
				colorSwatch={true}
			/>
		{/snippet}
	</BrandingSection>

	<!-- 3. Background Color Section -->
	<BrandingSection
		title="Background color"
		bind:toggleChecked={formData.showBackgroundColorInHeader}
		toggleDisabled={!hasBackgroundColor}
	>
		{#snippet children()}
			<Input
				type="text"
				bind:value={formData.backgroundColor}
				helpText="Hex color for project card and header background"
				error={validationErrors.backgroundColor}
				placeholder="#FFFFFF"
				pattern="^#[0-9A-Fa-f]{6}$"
				colorSwatch={true}
			/>
		{/snippet}
	</BrandingSection>

	<!-- 4. Featured Image Section -->
	<BrandingSection
		title="Featured image"
		bind:toggleChecked={formData.showFeaturedImageInHeader}
		toggleDisabled={!hasFeaturedImage}
	>
		{#snippet children()}
			<ImageUploader
				label=""
				bind:value={featuredImageMedia}
				onUpload={handleFeaturedImageUpload}
				onRemove={handleFeaturedImageRemove}
				placeholder="Drag and drop a featured image here, or click to browse"
				showBrowseLibrary={true}
				compact={true}
			/>
		{/snippet}
	</BrandingSection>
</section>

<style lang="scss">
	.branding-form {
		display: flex;
		flex-direction: column;
		gap: $unit-4x;
		margin-bottom: $unit-6x;

		&:last-child {
			margin-bottom: 0;
		}
	}
</style>
