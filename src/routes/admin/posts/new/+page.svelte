<script lang="ts">
	import { page } from '$app/stores'
	import { onMount } from 'svelte'
	import EssayForm from '$lib/components/admin/EssayForm.svelte'
	import SimplePostForm from '$lib/components/admin/SimplePostForm.svelte'

	let postType: 'post' | 'essay' = 'post'
	let mounted = false

	onMount(() => {
		const type = $page.url.searchParams.get('type')
		if (type && ['post', 'essay'].includes(type)) {
			postType = type as typeof postType
		}
		mounted = true
	})
</script>

{#if mounted}
	{#if postType === 'essay'}
		<EssayForm mode="create" />
	{:else}
		<SimplePostForm postType="post" mode="create" />
	{/if}
{/if}
