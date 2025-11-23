<script lang="ts">
	import { Spring } from 'svelte/motion'
	import type { Album } from '$lib/types/lastfm'
	import { audioPreview } from '$lib/stores/audio-preview'
	import NowPlaying from './NowPlaying.svelte'
	import PlayIcon from '$icons/play.svg?component'
	import PauseIcon from '$icons/pause.svg?component'

	interface AlbumProps {
		album?: Album
		albumId?: string
		hoveredAlbumId?: string | null
		onHover?: (albumId: string | null) => void
	}

	let { album = undefined, albumId = '', hoveredAlbumId = null, onHover }: AlbumProps = $props()

	let isHovering = $state(false)
	let audio: HTMLAudioElement | null = $state(null)

	// Create a unique ID for this album if not provided
	const currentAlbumId = $derived(albumId || (album ? `${album.artist.name}-${album.name}` : ''))

	// Subscribe to the store to know if this album is playing
	let isPlaying = $state(false)
	$effect(() => {
		const unsubscribe = audioPreview.subscribe((state) => {
			isPlaying = state.currentAlbumId === currentAlbumId && state.isPlaying
		})
		return unsubscribe
	})

	const scale = new Spring(1, {
		stiffness: 0.3,
		damping: 0.25
	})

	// Determine if this album should shrink
	const shouldShrink = $derived(hoveredAlbumId !== null && hoveredAlbumId !== currentAlbumId)

	$effect(() => {
		if (isHovering) {
			scale.target = 1.05
		} else if (shouldShrink) {
			scale.target = 0.97
		} else {
			scale.target = 1
		}
	})

	async function togglePreview(e: Event) {
		e.preventDefault()
		e.stopPropagation()

		if (!audio && album?.appleMusicData?.previewUrl) {
			audio = new Audio(album.appleMusicData.previewUrl)
			audio.addEventListener('ended', () => {
				audioPreview.stop()
			})
		}

		if (audio) {
			if (isPlaying) {
				audioPreview.stop()
			} else {
				// Update the store first, then play
				audioPreview.play(audio, currentAlbumId)
				try {
					await audio.play()
				} catch (error) {
					console.error('Failed to play preview:', error)
					audioPreview.stop()
				}
			}
		}
	}

	$effect(() => {
		// Cleanup audio when component unmounts
		return () => {
			if (audio && isPlaying) {
				audioPreview.stop()
			}
		}
	})

	// Use high-res artwork if available
	const artworkUrl = $derived(
		album?.appleMusicData?.highResArtwork ||
			album?.images?.itunes ||
			album?.images?.mega ||
			album?.images?.extralarge ||
			album?.images?.large ||
			album?.images?.medium ||
			album?.images?.small ||
			''
	)

	const hasPreview = $derived(!!album?.appleMusicData?.previewUrl)

	// Use the album's isNowPlaying status directly - single source of truth
	const isNowPlaying = $derived(album?.isNowPlaying ?? false)
	const nowPlayingTrack = $derived(album?.nowPlayingTrack)

	// Use Apple Music URL if available, otherwise fall back to Last.fm
	const albumUrl = $derived(album?.appleMusicData?.url || album?.url || '#')

	// Debug logging
	$effect(() => {
		if (album && (isNowPlaying || album.isNowPlaying)) {
			console.log(`🎵 Album component "${album.name}":`, {
				isNowPlaying,
				nowPlayingTrack,
				albumData: album
			})
		}
	})
</script>

<div class="album">
	{#if album}
		<div class="album-wrapper">
			<a
				href={albumUrl}
				target="_blank"
				rel="noopener noreferrer"
				onmouseenter={() => {
					isHovering = true
					onHover?.(currentAlbumId)
				}}
				onmouseleave={() => {
					isHovering = false
					onHover?.(null)
				}}
			>
				<div class="artwork-container">
					<img
						src={artworkUrl}
						alt={album.name}
						style="transform: scale({scale.current})"
						loading="lazy"
					/>
					{#if isNowPlaying}
						<NowPlaying trackName={nowPlayingTrack} />
					{/if}
					{#if hasPreview && (isHovering || isPlaying)}
						<button
							class="preview-button"
							class:corner={isPlaying && !isHovering}
							onclick={togglePreview}
							aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
							class:playing={isPlaying}
						>
							{#if isPlaying}
								<PauseIcon />
							{:else}
								<PlayIcon />
							{/if}
						</button>
					{/if}
				</div>
				<div class="info">
					<span class="album-name">
						{album.name}
					</span>
					<p class="artist-name">
						{album.artist.name}
					</p>
				</div>
			</a>
		</div>
	{:else}
		<p>No album provided</p>
	{/if}
</div>

<style lang="scss">
	.album {
		width: 100%;
		height: 100%;

		.album-wrapper {
			display: flex;
			flex-direction: column;
			gap: $unit;
			width: 100%;
			height: 100%;
		}

		a {
			display: flex;
			flex-direction: column;
			gap: $unit * 1.5;
			text-decoration: none;
			transition: gap $transition-fast ease-in-out;
			width: 100%;
			height: 100%;

			.artwork-container {
				position: relative;
				width: 100%;
				aspect-ratio: 1 / 1;
				background-color: $gray-5;
				border-radius: $unit;
			}

			img {
				border: 1px solid $shadow-light;
				border-radius: $unit;
				box-shadow: 0 0 8px $shadow-light;
				width: 100%;
				height: 100%;
				object-fit: cover;
				display: block;
			}

			.preview-button {
				position: absolute;
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%);
				width: 60px;
				height: 60px;
				background: rgba(0, 0, 0, 0.4);
				color: white;
				border: none;
				border-radius: 50%;
				cursor: pointer;
				display: flex;
				align-items: center;
				justify-content: center;
				font-size: 24px;
				transition: all $transition-medium ease;
				backdrop-filter: blur(10px);

				&.corner {
					top: auto;
					left: $unit * 1.5;
					bottom: $unit-2x;
					transform: none;
					width: 40px;
					height: 40px;
					font-size: 18px;
				}

				&:hover {
					background: $overlay-medium;
					transform: translate(-50%, -50%) scale(1.1);

					&.corner {
						transform: scale(1.1);
					}
				}

				&.playing {
					background: $accent-color;
				}
			}

			.info {
				display: flex;
				flex-direction: column;
				gap: $unit-fourth;

				p {
					padding: 0;
					margin: 0;
				}

				.album-name {
					font-size: $font-size;
					font-weight: $font-weight-med;
					color: $accent-color;
					overflow: hidden;
					text-overflow: ellipsis;
					display: -webkit-box;
					-webkit-line-clamp: 2;
					-webkit-box-orient: vertical;
				}

				.artist-name {
					font-size: $font-size-extra-small;
					font-weight: $font-weight-med;
					color: $gray-40;
				}
			}
		}

		.preview-container {
			margin-top: $unit;
		}
	}
</style>
