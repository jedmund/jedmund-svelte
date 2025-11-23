<script lang="ts">
	import { page } from '$app/stores'
	import InlineComposerModal from '$lib/components/admin/InlineComposerModal.svelte'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'

	// Get initial state from URL params
	const postType = $derived(($page.url.searchParams.get('type') as 'post' | 'essay') || 'essay')
	const initialContent = $derived(
		$page.url.searchParams.get('content')
			? JSON.parse($page.url.searchParams.get('content')!)
			: undefined
	)
</script>

<svelte:head>
	<title>Compose - Universe - Admin @jedmund</title>
</svelte:head>

<AdminPage>
	<InlineComposerModal
		isOpen={true}
		initialMode="page"
		initialPostType={postType}
		{initialContent}
	/>
</AdminPage>
