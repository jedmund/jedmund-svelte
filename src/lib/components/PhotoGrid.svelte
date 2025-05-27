<script lang="ts">
	import PhotoItem from '$components/PhotoItem.svelte'
	import PhotoLightbox from '$components/PhotoLightbox.svelte'
	import type { PhotoItem as PhotoItemType, Photo } from '$lib/types/photos'

	const { photoItems }: { photoItems: PhotoItemType[] } = $props()

	let lightboxPhoto: Photo | null = $state(null)
	let lightboxAlbumPhotos: Photo[] = $state([])
	let lightboxIndex = $state(0)

	function openLightbox(photo: Photo, albumPhotos?: Photo[]) {
		if (albumPhotos && albumPhotos.length > 0) {
			// For albums, start with the first photo, not the cover photo
			lightboxAlbumPhotos = albumPhotos
			lightboxIndex = 0
			lightboxPhoto = albumPhotos[0]
		} else {
			// For individual photos
			lightboxPhoto = photo
			lightboxAlbumPhotos = []
			lightboxIndex = 0
		}
	}

	function closeLightbox() {
		lightboxPhoto = null
		lightboxAlbumPhotos = []
		lightboxIndex = 0
	}

	function navigateLightbox(direction: 'prev' | 'next') {
		if (lightboxAlbumPhotos.length === 0) return

		if (direction === 'prev') {
			lightboxIndex = lightboxIndex > 0 ? lightboxIndex - 1 : lightboxAlbumPhotos.length - 1
		} else {
			lightboxIndex = lightboxIndex < lightboxAlbumPhotos.length - 1 ? lightboxIndex + 1 : 0
		}

		lightboxPhoto = lightboxAlbumPhotos[lightboxIndex]
	}
</script>

<div class="photo-grid-container">
	<div class="photo-grid">
		{#each photoItems as item}
			<PhotoItem {item} onPhotoClick={openLightbox} />
		{/each}
	</div>
</div>

{#if lightboxPhoto}
	<PhotoLightbox
		photo={lightboxPhoto}
		albumPhotos={lightboxAlbumPhotos}
		currentIndex={lightboxIndex}
		onClose={closeLightbox}
		onNavigate={navigateLightbox}
	/>
{/if}

<style lang="scss">
	.photo-grid-container {
		width: 100%;
		padding: 0 $unit-2x;

		@include breakpoint('phone') {
			padding: $unit-3x $unit;
		}
	}

	.photo-grid {
		columns: 3;
		column-gap: $unit-2x;
		max-width: 700px;
		margin: 0 auto;

		@include breakpoint('tablet') {
			columns: 2;
			column-gap: $unit;
		}

		@include breakpoint('phone') {
			columns: 1;
		}
	}
</style>
