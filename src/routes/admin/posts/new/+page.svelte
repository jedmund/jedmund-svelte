<script lang="ts">
	import { page } from '$app/stores'
	import { onMount } from 'svelte'
	import PostForm from '$lib/components/admin/forms/PostForm.svelte'
	import type { JSONContent } from '@tiptap/core'

	let initialPostType = $state<'post' | 'essay'>('post')
	let initialContent = $state<JSONContent | null>(null)
	let ready = $state(false)

	onMount(() => {
		const type = $page.url.searchParams.get('type')
		if (type === 'post' || type === 'essay') {
			initialPostType = type
		}

		const stashed = sessionStorage.getItem('draft_content')
		if (stashed) {
			try {
				initialContent = JSON.parse(stashed)
				sessionStorage.removeItem('draft_content')
			} catch (e) {
				console.error('Failed to parse draft content:', e)
			}
		}
		ready = true
	})
</script>

{#if ready}
	<PostForm {initialPostType} {initialContent} />
{/if}
