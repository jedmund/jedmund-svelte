<script lang="ts">
	import type { Album } from '$lib/types/lastfm'

	interface Props {
		album: Album
		getAlbumArtwork: (album: Album) => string
	}

	let { album, getAlbumArtwork }: Props = $props()
	
	const trackText = $derived(`${album.artist.name} — ${album.name}${
		album.appleMusicData?.releaseDate 
			? ` (${new Date(album.appleMusicData.releaseDate).getFullYear()})` 
			: ''
	} — ${album.nowPlayingTrack || album.name}`)
</script>

<nav class="now-playing-bar">
	<div class="now-playing-content">
		{#if getAlbumArtwork(album)}
			<img src={getAlbumArtwork(album)} alt="{album.name} album cover" class="album-thumbnail" />
		{/if}
		<span class="track-info">
			<span class="now-playing-label">Now playing</span>
			<div class="marquee-container">
				<span class="now-playing-title">{trackText}</span>
				<span class="now-playing-title" aria-hidden="true">{trackText}</span>
			</div>
		</span>
	</div>
</nav>

<style lang="scss">
	.now-playing-bar {
		display: flex;
		align-items: center;
		gap: 4px;
		background: $gray-100;
		padding: calc($unit-half - 1px) $unit-half;
		border-radius: 100px;
		box-shadow: 0 1px 3px $shadow-light;
		position: relative;
		overflow: hidden;
		box-sizing: border-box;
		min-height: 58.4px;
		width: 404px;
	}

	.now-playing-label {
		font-size: $font-size-extra-small;
		font-weight: $font-weight-med;
		color: $gray-50;
	}

	.now-playing-content {
		display: grid;
		grid-template-columns: 32px 1fr;
		align-items: center;
		gap: $unit-2x;
		width: 100%;
		padding: $unit $unit-2x;
		color: $text-color-subdued;
	}

	.album-thumbnail {
		width: 32px;
		height: 32px;
		border-radius: 4px;
		object-fit: cover;
		flex-shrink: 0;
	}

	.track-info {
		font-size: $font-size-small;
		font-weight: $font-weight-med;
		text-align: center;
		padding-right: 32px; // Balance out the image on the left
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.marquee-container {
		overflow: hidden;
		position: relative;
		width: 100%;
		display: flex;
		gap: 50px; // Space between repeated text
		
		// Gradient overlays
		&::before,
		&::after {
			content: '';
			position: absolute;
			top: 0;
			bottom: 0;
			width: 30px;
			z-index: 1;
			pointer-events: none;
		}
		
		&::before {
			left: 0;
			background: linear-gradient(to right, $gray-100, transparent);
		}
		
		&::after {
			right: 0;
			background: linear-gradient(to left, $gray-100, transparent);
		}
	}

	.now-playing-title {
		display: inline-block;
		white-space: nowrap;
		animation: marquee 15s linear infinite;
		flex-shrink: 0;
	}

	@keyframes marquee {
		0% {
			transform: translateX(0);
		}
		100% {
			transform: translateX(calc(-100% - 50px)); // Include gap in animation
		}
	}

</style>
