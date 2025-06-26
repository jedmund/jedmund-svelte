<script lang="ts">
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import ImageUploader from '$lib/components/admin/ImageUploader.svelte'
	import type { Media } from '@prisma/client'

	let singleImage = $state<Media | null>(null)
	let logoImage = $state<Media | null>(null)
	let bannerImage = $state<Media | null>(null)

	function handleSingleImageUpload(media: Media) {
		singleImage = media
		console.log('Single image uploaded:', media)
	}

	function handleLogoUpload(media: Media) {
		logoImage = media
		console.log('Logo uploaded:', media)
	}

	function handleBannerUpload(media: Media) {
		bannerImage = media
		console.log('Banner uploaded:', media)
	}

	function logAllValues() {
		console.log('All uploaded images:', {
			singleImage,
			logoImage,
			bannerImage
		})
	}

	function clearAll() {
		singleImage = null
		logoImage = null
		bannerImage = null
	}
</script>

<AdminPage title="ImageUploader Test" subtitle="Test the new direct upload functionality">
	<div class="test-container">
		<!-- Basic Image Upload -->
		<section class="test-section">
			<h2>Basic Image Upload</h2>
			<p>Standard image upload with alt text support.</p>

			<ImageUploader
				label="Featured Image"
				bind:value={singleImage}
				onUpload={handleSingleImageUpload}
				allowAltText={true}
				helpText="Upload any image to test the basic functionality."
			/>
		</section>

		<!-- Square Logo Upload -->
		<section class="test-section">
			<h2>Square Logo Upload</h2>
			<p>Image upload with 1:1 aspect ratio constraint.</p>

			<ImageUploader
				label="Company Logo"
				bind:value={logoImage}
				onUpload={handleLogoUpload}
				aspectRatio="1:1"
				allowAltText={true}
				required={true}
				maxFileSize={2}
				helpText="Upload a square logo (1:1 aspect ratio). Max 2MB."
			/>
		</section>

		<!-- Banner Image Upload -->
		<section class="test-section">
			<h2>Banner Image Upload</h2>
			<p>Wide banner image with 16:9 aspect ratio.</p>

			<ImageUploader
				label="Hero Banner"
				bind:value={bannerImage}
				onUpload={handleBannerUpload}
				aspectRatio="16:9"
				allowAltText={true}
				showBrowseLibrary={true}
				placeholder="Drag and drop a banner image here"
				helpText="Recommended size: 1920x1080 pixels for best quality."
			/>
		</section>

		<!-- Form Actions -->
		<section class="test-section">
			<h2>Actions</h2>
			<div class="actions-grid">
				<button type="button" class="btn btn-primary" onclick={logAllValues}>
					Log All Values
				</button>
				<button type="button" class="btn btn-ghost" onclick={clearAll}> Clear All </button>
			</div>
		</section>

		<!-- Values Display -->
		<section class="test-section">
			<h2>Current Values</h2>
			<div class="values-display">
				<div class="value-item">
					<h4>Single Image:</h4>
					<pre>{JSON.stringify(
							singleImage
								? {
										id: singleImage.id,
										filename: singleImage.filename,
										altText: singleImage.altText,
										description: singleImage.description
									}
								: null,
							null,
							2
						)}</pre>
				</div>

				<div class="value-item">
					<h4>Logo Image:</h4>
					<pre>{JSON.stringify(
							logoImage
								? {
										id: logoImage.id,
										filename: logoImage.filename,
										altText: logoImage.altText,
										description: logoImage.description
									}
								: null,
							null,
							2
						)}</pre>
				</div>

				<div class="value-item">
					<h4>Banner Image:</h4>
					<pre>{JSON.stringify(
							bannerImage
								? {
										id: bannerImage.id,
										filename: bannerImage.filename,
										altText: bannerImage.altText,
										description: bannerImage.description
									}
								: null,
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
		max-width: 800px;
		margin: 0 auto;
		padding: $unit-4x;
	}

	.test-section {
		margin-bottom: $unit-6x;
		padding: $unit-4x;
		background-color: white;
		border-radius: $card-corner-radius;
		border: 1px solid $gray-90;

		h2 {
			margin: 0 0 $unit 0;
			font-size: 1.25rem;
			font-weight: 600;
			color: $gray-10;
		}

		p {
			margin: 0 0 $unit-3x 0;
			color: $gray-30;
			font-size: 0.875rem;
		}
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
			color: $gray-20;
		}

		pre {
			background-color: $gray-95;
			padding: $unit-2x;
			border-radius: $card-corner-radius;
			font-size: 0.75rem;
			color: $gray-10;
			overflow-x: auto;
			margin: 0;
			white-space: pre-wrap;
			word-break: break-all;
		}
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: $unit;
		font-weight: 500;
		border: none;
		cursor: pointer;
		transition: all 0.15s ease;
		outline: none;
		position: relative;
		white-space: nowrap;
		padding: $unit $unit-2x;
		font-size: 14px;
		border-radius: 24px;
		min-height: 36px;

		&.btn-primary {
			background-color: $red-60;
			color: white;

			&:hover {
				background-color: $red-80;
			}
		}

		&.btn-ghost {
			background-color: transparent;
			color: $gray-20;

			&:hover {
				background-color: $gray-5;
				color: $gray-00;
			}
		}
	}

	@media (max-width: 768px) {
		.test-container {
			padding: $unit-2x;
		}

		.test-section {
			padding: $unit-3x;
		}

		.actions-grid {
			flex-direction: column;
		}

		.values-display {
			grid-template-columns: 1fr;
		}
	}
</style>
