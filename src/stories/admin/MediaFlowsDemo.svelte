<script lang="ts">
	import { onMount } from 'svelte'
	import type { Media } from '@prisma/client'
	import Button from '$lib/components/admin/Button.svelte'
	import UnifiedMediaModal from '$lib/components/admin/UnifiedMediaModal.svelte'
	import MediaDetailsModal from '$lib/components/admin/MediaDetailsModal.svelte'
	import ImagePicker from '$lib/components/admin/ImagePicker.svelte'
	import AlbumSelector from '$lib/components/admin/AlbumSelector.svelte'
	import AlbumSelectorModal from '$lib/components/admin/AlbumSelectorModal.svelte'
	import MediaUploadModal from '$lib/components/admin/MediaUploadModal.svelte'
	let {
		flow = 'library',
		failSelection = false
	}: {
		flow?: 'library' | 'details' | 'picker' | 'albums' | 'bulkAlbums' | 'upload'
		failSelection?: boolean
	} = $props()
	const media = ['red', 'blue'].map((color, index) => ({
		id: index + 1,
		filename: `${color}.png`,
		mimeType: 'image/png',
		size: 1024,
		url:
			'data:image/svg+xml,' +
			encodeURIComponent(
				`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="${color}"/></svg>`
			),
		description: color,
		isPhotography: true,
		width: 400,
		height: 300,
		createdAt: new Date(),
		updatedAt: new Date()
	})) as Media[]
	let ready = $state(false)
	let open = $state(true)
	let selected = $state<number[]>([])
	let saved = $state(false)
	let value = $state<Media | null>(media[0])
	onMount(() => {
		const original = window.fetch
		window.fetch = async (input, options) => {
			const url = new URL(String(input), window.location.origin)
			if (url.pathname === '/api/media/upload') return Response.json(media[0])
			if (url.pathname === '/api/media') {
				const search = url.searchParams.get('search') || ''
				return Response.json({
					media: media.filter((item) => item.filename.includes(search)),
					pagination: { totalPages: 1 }
				})
			}
			if (/^\/api\/media\/\d+$/.test(url.pathname)) {
				const item = media.find((item) => item.id === Number(url.pathname.split('/').pop()))
				return Response.json(
					options?.body ? { ...item, ...JSON.parse(String(options.body)) } : item
				)
			}
			if (url.pathname.endsWith('/usage')) return Response.json({ usage: [] })
			if (url.pathname.endsWith('/albums'))
				return Response.json({
					albums: [{ id: 1, title: 'Sample album', slug: 'sample' }],
					pagination: { total: 1 }
				})
			if (url.pathname.startsWith('/api/heart/')) return Response.json({ heart: 3 })
			if (url.pathname.startsWith('/api/albums/')) return Response.json({ success: true })
			return original(input, options)
		}
		ready = true
		return () => {
			window.fetch = original
		}
	})
</script>

{#if ready}
	{#if flow === 'library'}
		<Button onclick={() => (open = true)}>Open library</Button>
		<p data-testid="selection">Selected: {selected.join(', ')}</p>
		<UnifiedMediaModal
			bind:isOpen={open}
			onSelect={async (items) => {
				if (failSelection) throw new Error('Synthetic selection callback failed')
				selected = (Array.isArray(items) ? items : [items]).map((item) => item.id)
			}}
		/>
	{:else if flow === 'details'}
		<Button onclick={() => (open = true)}>Open details</Button>
		<MediaDetailsModal
			bind:isOpen={open}
			media={value}
			onUpdate={(item) => {
				value = item
			}}
			onClose={() => (open = false)}
		/>
	{:else if flow === 'picker'}
		<ImagePicker label="Featured image" bind:value />
	{:else if flow === 'bulkAlbums'}
		<p data-testid="saved">{saved ? 'Membership saved' : 'Waiting'}</p>
		<AlbumSelectorModal
			bind:isOpen={open}
			selectedMediaIds={[1, 2]}
			onSave={() => {
				saved = true
			}}
		/>
	{:else if flow === 'upload'}
		<Button onclick={() => (open = true)}>Open upload</Button>
		<MediaUploadModal
			bind:isOpen={open}
			onClose={() => (open = false)}
			onUploadComplete={() => {
				saved = true
			}}
		/>
	{:else}
		<AlbumSelector mediaId={1} currentAlbums={[]} />
	{/if}
{/if}
