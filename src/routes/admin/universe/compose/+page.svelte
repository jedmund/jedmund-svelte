<script lang="ts">
	import { page } from '$app/stores'
	import UniverseComposer from '$lib/components/admin/UniverseComposer.svelte'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'

	// Get initial state from URL params
	$: postType = ($page.url.searchParams.get('type') as 'post' | 'essay' | 'album') || 'essay'
	$: initialContent = $page.url.searchParams.get('content')
		? JSON.parse($page.url.searchParams.get('content')!)
		: undefined
</script>

<AdminPage>
	<UniverseComposer isOpen={true} initialMode="page" initialPostType={postType} {initialContent} />
</AdminPage>
