<script lang="ts">
	import { onMount } from 'svelte'
	import type { Album } from '$lib/types/lastfm'
	import DebugAlbums from '$lib/components/debug/DebugAlbums.svelte'
	import DebugPanelContent from '$lib/components/debug/DebugPanelContent.svelte'
	import AppleMusicSearchModal from '$lib/components/AppleMusicSearchModal.svelte'
	let { view = 'panel' }: { view?: 'panel' | 'search' | 'albums' } = $props()
	let modal: AppleMusicSearchModal | undefined = $state.raw()
	let requests = $state(0)
	let expandedAlbumId = $state<string | null>('Sample Artist:Sample Album')
	const albums = [
		{
			name: 'Sample Album',
			artist: { name: 'Sample Artist' },
			isNowPlaying: true,
			appleMusicData: {
				appleMusicId: '123',
				releaseDate: '2026-01-01',
				tracks: [{ name: 'Sample Track', durationMs: 185000 }],
				searchMetadata: {
					searchQuery: 'Sample Artist Sample Album',
					searchTime: new Date().toISOString()
				}
			}
		}
	] as Album[]
	onMount(() => {
		const original = window.fetch
		window.fetch = async (input, options) => {
			const url = String(input)
			if (url.startsWith('/api/admin/debug/')) {
				requests++
				if (url.endsWith('/clear-cache')) return Response.json({ deleted: 2 })
				return Response.json({
					results: { songs: [{ name: JSON.parse(String(options?.body)).query }] }
				})
			}
			return original(input, options)
		}
		return () => {
			window.fetch = original
		}
	})
</script>

<p data-testid="debug-requests">Requests: {requests}</p>
{#if view === 'panel'}
	<DebugPanelContent />
{:else if view === 'albums'}
	<div class="album-preview">
		<DebugAlbums {albums} bind:expandedAlbumId clearingAlbums={new Set()} onClear={() => {}} />
	</div>
{:else}
	<label>Outside input <input placeholder="Outside input" /></label>
	<button type="button" onclick={() => modal?.open()}>Open search</button>
	<AppleMusicSearchModal bind:this={modal} />
{/if}

<style lang="scss">
	.album-preview {
		padding: $unit * 2;
		background: #141414;
		color: white;
		max-width: 420px;
		:global(.icon) {
			width: 14px;
			height: 14px;
		}
	}
</style>
