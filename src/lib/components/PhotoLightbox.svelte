<script lang="ts">
	import type { Photo } from '$lib/types/photos'

	const {
		photo,
		albumPhotos = [],
		currentIndex = 0,
		onClose,
		onNavigate
	}: {
		photo: Photo
		albumPhotos?: Photo[]
		currentIndex?: number
		onClose: () => void
		onNavigate: (direction: 'prev' | 'next') => void
	} = $props()

	let imageLoaded = $state(false)
	let currentPhotoId = $state(photo.id)

	const hasNavigation = $derived(albumPhotos.length > 1)
	const hasExifData = $derived(photo.exif && Object.keys(photo.exif).length > 0)

	// Reset loading state when photo changes
	$effect(() => {
		if (photo.id !== currentPhotoId) {
			imageLoaded = false
			currentPhotoId = photo.id
		}
	})

	function handleImageLoad() {
		imageLoaded = true
	}

	function handleKeydown(event: KeyboardEvent) {
		switch (event.key) {
			case 'Escape':
				onClose()
				break
			case 'ArrowLeft':
				if (hasNavigation) onNavigate('prev')
				break
			case 'ArrowRight':
				if (hasNavigation) onNavigate('next')
				break
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onClose()
		}
	}

	function formatExifValue(key: string, value: string): string {
		switch (key) {
			case 'dateTaken':
				return new Date(value).toLocaleDateString('en-US', {
					year: 'numeric',
					month: 'long',
					day: 'numeric'
				})
			default:
				return value
		}
	}

	function getExifLabel(key: string): string {
		const labels: Record<string, string> = {
			camera: 'Camera',
			lens: 'Lens',
			focalLength: 'Focal Length',
			aperture: 'Aperture',
			shutterSpeed: 'Shutter Speed',
			iso: 'ISO',
			dateTaken: 'Date Taken',
			location: 'Location'
		}
		return labels[key] || key
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="lightbox-backdrop" onclick={handleBackdropClick}>
	<div class="lightbox-container">
		<!-- Close button -->
		<button class="close-button" onclick={onClose} type="button">
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
				<path
					d="M6 6l12 12M18 6l-12 12"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
				/>
			</svg>
		</button>

		<!-- Navigation buttons -->
		{#if hasNavigation}
			<button class="nav-button nav-prev" onclick={() => onNavigate('prev')} type="button">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
					<path
						d="M15 18l-6-6 6-6"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</button>
			<button class="nav-button nav-next" onclick={() => onNavigate('next')} type="button">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
					<path
						d="M9 18l6-6-6-6"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
			</button>
		{/if}

		<!-- Photo -->
		<div class="photo-container">
			<img src={photo.src} alt={photo.alt} onload={handleImageLoad} class:loaded={imageLoaded} />
			{#if !imageLoaded}
				<div class="loading-indicator">
					<div class="spinner"></div>
				</div>
			{/if}
		</div>

		<!-- Photo info -->
		<div class="photo-info" class:loaded={imageLoaded}>
			{#if photo.caption}
				<h3 class="photo-caption">{photo.caption}</h3>
			{/if}

			{#if hasExifData}
				<div class="exif-data">
					<h4>Camera Settings</h4>
					<dl class="exif-list">
						{#each Object.entries(photo.exif) as [key, value]}
							<div class="exif-item">
								<dt>{getExifLabel(key)}</dt>
								<dd>{formatExifValue(key, value)}</dd>
							</div>
						{/each}
					</dl>
				</div>
			{/if}

			{#if hasNavigation}
				<div class="navigation-info">
					{currentIndex + 1} of {albumPhotos.length}
				</div>
			{/if}
		</div>
	</div>
</div>

<style lang="scss">
	.lightbox-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.95);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: $unit-2x;

		@include breakpoint('phone') {
			padding: $unit;
		}
	}

	.lightbox-container {
		position: relative;
		max-width: 90vw;
		max-height: 90vh;
		display: flex;
		gap: $unit-3x;

		@include breakpoint('phone') {
			flex-direction: column;
			max-width: 95vw;
			max-height: 95vh;
			gap: $unit-2x;
		}
	}

	.close-button {
		position: absolute;
		top: -$unit-6x;
		right: 0;
		background: none;
		border: none;
		color: white;
		cursor: pointer;
		padding: $unit;
		border-radius: $corner-radius;
		transition: background-color 0.2s ease;
		z-index: 10;

		&:hover {
			background: rgba(255, 255, 255, 0.1);
		}

		@include breakpoint('phone') {
			top: -$unit-4x;
			right: -$unit;
		}
	}

	.nav-button {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		background: rgba(0, 0, 0, 0.5);
		border: none;
		color: white;
		cursor: pointer;
		padding: $unit-2x;
		border-radius: $corner-radius;
		transition: background-color 0.2s ease;
		z-index: 10;

		&:hover {
			background: rgba(0, 0, 0, 0.7);
		}

		&.nav-prev {
			left: -$unit-6x;
		}

		&.nav-next {
			right: -$unit-6x;
		}

		@include breakpoint('phone') {
			&.nav-prev {
				left: $unit;
			}

			&.nav-next {
				right: $unit;
			}
		}
	}

	.photo-container {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;

		img {
			max-width: 70vw;
			max-height: 80vh;
			height: auto;
			border-radius: $corner-radius;
			opacity: 0;
			transition: opacity 0.3s ease;

			&.loaded {
				opacity: 1;
			}

			@include breakpoint('phone') {
				max-width: 95vw;
				max-height: 60vh;
			}
		}
	}

	.loading-indicator {
		position: absolute;
		display: flex;
		align-items: center;
		justify-content: center;

		.spinner {
			width: 40px;
			height: 40px;
			border: 3px solid rgba(255, 255, 255, 0.2);
			border-top-color: white;
			border-radius: 50%;
			animation: spin 1s linear infinite;
		}
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.photo-info {
		width: 300px;
		color: white;
		overflow-y: auto;
		padding: $unit-2x;
		background: rgba(0, 0, 0, 0.3);
		border-radius: $corner-radius;
		backdrop-filter: blur(10px);
		opacity: 0;
		transition: opacity 0.3s ease 0.1s; // Slight delay to sync with image

		&.loaded {
			opacity: 1;
		}

		@include breakpoint('phone') {
			width: 100%;
			max-height: 30vh;
		}
	}

	.photo-caption {
		margin: 0 0 $unit-3x 0;
		font-size: 1.2rem;
		font-weight: 600;
		line-height: 1.4;
	}

	.exif-data {
		margin-bottom: $unit-3x;

		h4 {
			margin: 0 0 $unit-2x 0;
			font-size: 1rem;
			font-weight: 600;
			opacity: 0.8;
		}
	}

	.exif-list {
		display: flex;
		flex-direction: column;
		gap: $unit;
		margin: 0;
	}

	.exif-item {
		display: flex;
		justify-content: space-between;
		align-items: baseline;

		dt {
			font-weight: 500;
			opacity: 0.7;
			margin-right: $unit-2x;
		}

		dd {
			margin: 0;
			text-align: right;
			font-family: 'Monaco', 'Menlo', monospace;
			font-size: 0.9rem;
		}
	}

	.navigation-info {
		text-align: center;
		opacity: 0.7;
		font-size: 0.9rem;
	}
</style>
