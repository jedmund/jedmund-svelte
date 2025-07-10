<script lang="ts">
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import UnifiedMediaModal from '$lib/components/admin/UnifiedMediaModal.svelte'
	import Button from '$lib/components/admin/Button.svelte'
	import type { Media } from '@prisma/client'

	let showSingleModal = $state(false)
	let showMultipleModal = $state(false)
	let selectedSingleMedia = $state<Media | null>(null)
	let selectedMultipleMedia = $state<Media[]>([])

	function handleSingleSelect(media: Media) {
		selectedSingleMedia = media
		console.log('Single media selected:', media)
	}

	function handleMultipleSelect(media: Media[]) {
		selectedMultipleMedia = media
		console.log('Multiple media selected:', media)
	}

	function openSingleModal() {
		showSingleModal = true
	}

	function openMultipleModal() {
		showMultipleModal = true
	}

	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 B'
		const k = 1024
		const sizes = ['B', 'KB', 'MB', 'GB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
	}
</script>

<AdminPage title="Media Library Test" subtitle="Test the UnifiedMediaModal component">
	<div class="test-container">
		<section class="test-section">
			<h2>Single Selection Mode</h2>
			<p>Test selecting a single media item.</p>

			<Button variant="primary" onclick={openSingleModal}>Open Single Selection Modal</Button>

			{#if selectedSingleMedia}
				<div class="selected-media">
					<h3>Selected Media:</h3>
					<div class="media-preview">
						{#if selectedSingleMedia.thumbnailUrl}
							<img src={selectedSingleMedia.thumbnailUrl} alt={selectedSingleMedia.filename} />
						{/if}
						<div class="media-details">
							<p><strong>Filename:</strong> {selectedSingleMedia.filename}</p>
							<p><strong>Size:</strong> {formatFileSize(selectedSingleMedia.size)}</p>
							<p><strong>Type:</strong> {selectedSingleMedia.mimeType}</p>
							{#if selectedSingleMedia.width && selectedSingleMedia.height}
								<p>
									<strong>Dimensions:</strong>
									{selectedSingleMedia.width}×{selectedSingleMedia.height}
								</p>
							{/if}
						</div>
					</div>
				</div>
			{/if}
		</section>

		<section class="test-section">
			<h2>Multiple Selection Mode</h2>
			<p>Test selecting multiple media items.</p>

			<Button variant="primary" onclick={openMultipleModal}>Open Multiple Selection Modal</Button>

			{#if selectedMultipleMedia.length > 0}
				<div class="selected-media">
					<h3>Selected Media ({selectedMultipleMedia.length} items):</h3>
					<div class="media-grid">
						{#each selectedMultipleMedia as media}
							<div class="media-item">
								{#if media.thumbnailUrl}
									<img src={media.thumbnailUrl} alt={media.filename} />
								{/if}
								<div class="media-info">
									<p class="filename">{media.filename}</p>
									<p class="size">{formatFileSize(media.size)}</p>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</section>

		<section class="test-section">
			<h2>Image Only Selection</h2>
			<p>Test selecting only image files.</p>

			<Button
				variant="secondary"
				onclick={() => {
					showSingleModal = true
					// This will be passed to the modal for image-only filtering
				}}
			>
				Open Image Selection Modal
			</Button>
		</section>
	</div>

	<!-- Modals -->
	<UnifiedMediaModal
		bind:isOpen={showSingleModal}
		mode="single"
		fileType="all"
		title="Select a Media File"
		confirmText="Select File"
		onSelect={handleSingleSelect}
	/>

	<UnifiedMediaModal
		bind:isOpen={showMultipleModal}
		mode="multiple"
		fileType="all"
		title="Select Media Files"
		confirmText="Select Files"
		onSelect={handleMultipleSelect}
	/>
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
		}
	}

	.selected-media {
		margin-top: $unit-4x;
		padding: $unit-3x;
		background-color: $gray-95;
		border-radius: $card-corner-radius;

		h3 {
			margin: 0 0 $unit-2x 0;
			font-size: 1.125rem;
			font-weight: 600;
			color: $gray-10;
		}
	}

	.media-preview {
		display: flex;
		gap: $unit-3x;
		align-items: flex-start;

		img {
			width: 120px;
			height: 120px;
			object-fit: cover;
			border-radius: $card-corner-radius;
			border: 1px solid $gray-80;
		}

		.media-details {
			flex: 1;

			p {
				margin: 0 0 $unit-half 0;
				font-size: 0.875rem;
				color: $gray-20;

				strong {
					font-weight: 600;
					color: $gray-10;
				}
			}
		}
	}

	.media-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: $unit-2x;
	}

	.media-item {
		display: flex;
		flex-direction: column;
		gap: $unit;

		img {
			width: 100%;
			height: 80px;
			object-fit: cover;
			border-radius: $card-corner-radius;
			border: 1px solid $gray-80;
		}

		.media-info {
			.filename {
				margin: 0;
				font-size: 0.75rem;
				font-weight: 500;
				color: $gray-10;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}

			.size {
				margin: 0;
				font-size: 0.625rem;
				color: $gray-40;
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

		.media-preview {
			flex-direction: column;

			img {
				width: 100%;
				height: 200px;
			}
		}
	}
</style>
