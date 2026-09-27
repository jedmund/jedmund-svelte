<script lang="ts">
	import type { Album } from '$lib/types/lastfm'
	import DebugSection from './DebugSection.svelte'
	import DebugAlbumCard from './DebugAlbumCard.svelte'
	let {
		albums,
		expandedAlbumId = $bindable(),
		clearingAlbums,
		onClear
	}: {
		albums: Album[]
		expandedAlbumId: string | null
		clearingAlbums: Set<string>
		onClear: (album: Album) => void
	} = $props()
</script>

<DebugSection title={`Recent Albums (${albums.length})`}>
	<div class="albums-list">
		{#each albums as album}
			{@const albumId = `${album.artist.name}:${album.name}`}
			<DebugAlbumCard
				{album}
				expanded={expandedAlbumId === albumId}
				clearing={clearingAlbums.has(albumId)}
				onToggle={() => (expandedAlbumId = expandedAlbumId === albumId ? null : albumId)}
				onClear={() => onClear(album)}
			/>
		{/each}
	</div>
</DebugSection>

<style lang="scss">
	.albums-list {
		display: flex;
		flex-direction: column;
	}
</style>
