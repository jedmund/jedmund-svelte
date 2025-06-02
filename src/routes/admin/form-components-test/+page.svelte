<script lang="ts">
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import MediaInput from '$lib/components/admin/MediaInput.svelte'
	import ImagePicker from '$lib/components/admin/ImagePicker.svelte'
	import GalleryManager from '$lib/components/admin/GalleryManager.svelte'
	import Button from '$lib/components/admin/Button.svelte'
	import type { Media } from '@prisma/client'

	// State for different components
	let singleMedia = $state<Media | null>(null)
	let multipleMedia = $state<Media[]>([])
	let logoImage = $state<Media | null>(null)
	let featuredImage = $state<Media | null>(null)
	let galleryImages = $state<Media[]>([])
	let projectGallery = $state<Media[]>([])

	function handleSingleMediaSelect(media: Media | null) {
		singleMedia = media
		console.log('Single media selected:', media)
	}

	function handleMultipleMediaSelect(media: Media[]) {
		multipleMedia = media
		console.log('Multiple media selected:', media)
	}

	function handleLogoSelect(media: Media | null) {
		logoImage = media
		console.log('Logo selected:', media)
	}

	function handleFeaturedImageSelect(media: Media | null) {
		featuredImage = media
		console.log('Featured image selected:', media)
	}

	function handleGallerySelect(media: Media[]) {
		galleryImages = media
		console.log('Gallery images selected:', media)
	}

	function handleProjectGallerySelect(media: Media[]) {
		projectGallery = media
		console.log('Project gallery selected:', media)
	}

	function logAllValues() {
		console.log('All form values:', {
			singleMedia,
			multipleMedia,
			logoImage,
			featuredImage,
			galleryImages,
			projectGallery
		})
	}

	function clearAllValues() {
		singleMedia = null
		multipleMedia = []
		logoImage = null
		featuredImage = null
		galleryImages = []
		projectGallery = []
	}
</script>

<AdminPage title="Form Components Test" subtitle="Test all media form integration components">
	<div class="test-container">
		<!-- MediaInput Tests -->
		<section class="test-section">
			<h2>MediaInput Component</h2>
			<p>Generic input component for media selection with preview.</p>

			<div class="form-grid">
				<MediaInput
					label="Single Media File"
					bind:value={singleMedia}
					mode="single"
					fileType="all"
					placeholder="Choose any media file"
				/>

				<MediaInput
					label="Multiple Media Files"
					bind:value={multipleMedia}
					mode="multiple"
					fileType="all"
					placeholder="Choose multiple files"
				/>

				<MediaInput
					label="Single Image Only"
					bind:value={logoImage}
					mode="single"
					fileType="image"
					placeholder="Choose an image"
					required={true}
				/>
			</div>
		</section>

		<!-- ImagePicker Tests -->
		<section class="test-section">
			<h2>ImagePicker Component</h2>
			<p>Specialized image picker with enhanced preview and aspect ratio support.</p>

			<div class="form-grid">
				<ImagePicker
					label="Featured Image"
					bind:value={featuredImage}
					aspectRatio="16:9"
					placeholder="Select a featured image"
					showDimensions={true}
				/>

				<ImagePicker
					label="Square Logo"
					bind:value={logoImage}
					aspectRatio="1:1"
					placeholder="Select a square logo"
					required={true}
				/>
			</div>
		</section>

		<!-- GalleryManager Tests -->
		<section class="test-section">
			<h2>GalleryManager Component</h2>
			<p>Multiple image management with drag-and-drop reordering.</p>

			<div class="form-column">
				<GalleryManager label="Image Gallery" bind:value={galleryImages} showFileInfo={false} />

				<GalleryManager
					label="Project Gallery (Max 6 images)"
					bind:value={projectGallery}
					maxItems={6}
					showFileInfo={true}
				/>
			</div>
		</section>

		<!-- Form Actions -->
		<section class="test-section">
			<h2>Form Actions</h2>
			<div class="actions-grid">
				<Button variant="primary" onclick={logAllValues}>Log All Values</Button>
				<Button variant="ghost" onclick={clearAllValues}>Clear All</Button>
			</div>
		</section>

		<!-- Values Display -->
		<section class="test-section">
			<h2>Current Values</h2>
			<div class="values-display">
				<div class="value-item">
					<h4>Single Media:</h4>
					<pre>{JSON.stringify(singleMedia?.filename || null, null, 2)}</pre>
				</div>

				<div class="value-item">
					<h4>Multiple Media ({multipleMedia.length}):</h4>
					<pre>{JSON.stringify(
							multipleMedia.map((m) => m.filename),
							null,
							2
						)}</pre>
				</div>

				<div class="value-item">
					<h4>Featured Image:</h4>
					<pre>{JSON.stringify(featuredImage?.filename || null, null, 2)}</pre>
				</div>

				<div class="value-item">
					<h4>Gallery Images ({galleryImages.length}):</h4>
					<pre>{JSON.stringify(
							galleryImages.map((m) => m.filename),
							null,
							2
						)}</pre>
				</div>

				<div class="value-item">
					<h4>Project Gallery ({projectGallery.length}):</h4>
					<pre>{JSON.stringify(
							projectGallery.map((m) => m.filename),
							null,
							2
						)}</pre>
				</div>
			</div>
		</section>
	</div>
</AdminPage>

<style lang="scss">
	.test-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: $unit-4x;
	}

	.test-section {
		margin-bottom: $unit-6x;
		padding: $unit-4x;
		background-color: white;
		border-radius: $card-corner-radius;
		border: 1px solid $grey-90;

		h2 {
			margin: 0 0 $unit 0;
			font-size: 1.25rem;
			font-weight: 600;
			color: $grey-10;
		}

		p {
			margin: 0 0 $unit-3x 0;
			color: $grey-30;
			font-size: 0.875rem;
		}
	}

	.form-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: $unit-4x;
	}

	.form-column {
		display: flex;
		flex-direction: column;
		gap: $unit-4x;
	}

	.actions-grid {
		display: flex;
		gap: $unit-2x;
		justify-content: center;
	}

	.values-display {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: $unit-3x;
	}

	.value-item {
		h4 {
			margin: 0 0 $unit 0;
			font-size: 0.875rem;
			font-weight: 600;
			color: $grey-20;
		}

		pre {
			background-color: $grey-95;
			padding: $unit-2x;
			border-radius: $card-corner-radius;
			font-size: 0.75rem;
			color: $grey-10;
			overflow-x: auto;
			margin: 0;
			white-space: pre-wrap;
			word-break: break-all;
		}
	}

	@media (max-width: 768px) {
		.test-container {
			padding: $unit-2x;
		}

		.test-section {
			padding: $unit-3x;
		}

		.form-grid {
			grid-template-columns: 1fr;
			gap: $unit-3x;
		}

		.actions-grid {
			flex-direction: column;
		}

		.values-display {
			grid-template-columns: 1fr;
		}
	}
</style>
