<script lang="ts">
	import { page } from '$app/stores'
	import { onMount } from 'svelte'
	import EssayForm from '$lib/components/admin/EssayForm.svelte'
	import SimplePostForm from '$lib/components/admin/SimplePostForm.svelte'
	import PhotoPostForm from '$lib/components/admin/PhotoPostForm.svelte'
	import AlbumForm from '$lib/components/admin/AlbumForm.svelte'

	let postType: 'blog' | 'microblog' | 'link' | 'photo' | 'album' = 'blog'
	let mounted = false

	onMount(() => {
		const type = $page.url.searchParams.get('type')
		if (type && ['blog', 'microblog', 'link', 'photo', 'album'].includes(type)) {
			postType = type as typeof postType
		}
		mounted = true
	})
</script>

{#if mounted}
	{#if postType === 'blog'}
		<EssayForm mode="create" />
	{:else if postType === 'microblog' || postType === 'link'}
		<SimplePostForm {postType} mode="create" />
	{:else if postType === 'photo'}
		<PhotoPostForm mode="create" />
	{:else if postType === 'album'}
		<AlbumForm mode="create" />
	{/if}
{/if}
