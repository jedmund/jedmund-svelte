<script lang="ts">
	import { spring } from 'svelte/motion'
	import type { Album } from '$lib/types/lastfm'

	interface AlbumProps {
		album?: Album
	}

	let { album = undefined }: AlbumProps = $props()

	let isHovering = $state(false)

	const scale = spring(1, {
		stiffness: 0.2,
		damping: 0.145
	})

	$effect(() => {
		if (isHovering) {
			scale.set(1.1)
		} else {
			scale.set(1)
		}
	})
</script>

<div class="album">
	{#if album}
		<a
			href={album.url}
			target="_blank"
			rel="noopener noreferrer"
			onmouseenter={() => (isHovering = true)}
			onmouseleave={() => (isHovering = false)}
		>
			<img
				src={album.images.itunes ? album.images.itunes : album.images.mega}
				alt={album.name}
				style="transform: scale({$scale})"
			/>
			<div class="info">
				<span class="album-name">
					{album.name}
				</span>
				<p class="artist-name">
					{album.artist.name}
				</p>
			</div>
		</a>
	{:else}
		<p>No album provided</p>
	{/if}
</div>

<style lang="scss">
	.album {
		width: 100%;
		height: 100%;

		a {
			display: flex;
			flex-direction: column;
			gap: $unit * 1.5;
			text-decoration: none;
			transition: gap 0.125s ease-in-out;
			width: 100%;
			height: 100%;

			img {
				border: 1px solid rgba(0, 0, 0, 0.1);
				border-radius: $unit;
				box-shadow: 0 0 8px rgba(0, 0, 0, 0.1);
				width: 100%;
				height: auto;
				object-fit: cover;
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
					font-size: $font-size-small;
					font-weight: $font-weight-med;
					color: $grey-40;
				}
			}
		}
	}
</style>
