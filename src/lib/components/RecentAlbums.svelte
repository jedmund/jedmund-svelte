<script lang="ts">
	import Album from '$components/Album.svelte'
	import type { Album as AlbumType } from '$lib/types/lastfm'
	import { musicStream } from '$lib/stores/music-stream'

	interface RecentAlbumsProps {
		albums?: AlbumType[]
	}

	let { albums: initialAlbums = [] }: RecentAlbumsProps = $props()

	// Use SSE stream for real-time updates, fallback to initial albums
	let albums = $state<AlbumType[]>(initialAlbums)

	$effect(() => {
		const unsubscribe = musicStream.albums.subscribe((streamAlbums) => {
			if (streamAlbums.length > 0) {
				albums = streamAlbums
			}
		})
		return unsubscribe
	})

	let hoveredAlbumId: string | null = $state(null)

	function handleAlbumHover(albumId: string | null) {
		hoveredAlbumId = albumId
	}
</script>

<section class="recent-albums">
	{#if albums.length > 0}
		<ul>
			{#each albums.slice(0, 4) as album}
				<li>
					<Album
						{album}
						albumId={`${album.artist.name}-${album.name}`}
						{hoveredAlbumId}
						onHover={handleAlbumHover}
					/>
				</li>
			{/each}
		</ul>
	{:else}
		<p>Loading albums...</p>
	{/if}
</section>

<style lang="scss">
	.recent-albums {
		ul {
			list-style: none;
			margin: 0;
			padding: 0;
		}

		p {
			text-align: center;
		}

		// Desktop styles
		@include breakpoint('desktop') {
			ul {
				display: flex;
				flex-wrap: wrap;
				justify-content: space-between;

				li {
					flex: 1 1 calc(20% - 10px); // Adjust to fit exactly 5 albums
					margin: 5px;

					&:first-child {
						margin-left: $unit-5x;
					}

					&:last-child {
						margin-right: $unit-5x;
					}
				}
			}
		}

		@include breakpoint('phone') {
			ul {
				display: flex;
				overflow-x: auto;
				-webkit-overflow-scrolling: touch;
				scroll-snap-type: x mandatory;
				gap: $unit-2x;
				scrollbar-width: none; /* Firefox */
			}

			ul::-webkit-scrollbar {
				display: none;
			}

			li {
				flex: 0 0 auto;
				scroll-snap-align: start;
				width: 100%;
				padding: 0 $unit-3x;
				box-sizing: border-box;
			}
		}

		@include breakpoint('small-phone') {
			li {
				padding: 0 $unit-2x;
			}
		}
	}
</style>
