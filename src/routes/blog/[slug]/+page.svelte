<script lang="ts">
	import Page from '$components/Page.svelte'
	import PostContent from '$components/PostContent.svelte'
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()

	const pageTitle = data.post.title || 'Blog post'
</script>

<svelte:head>
	<title>{pageTitle} - jedmund</title>
	<meta name="description" content={data.post.excerpt} />
</svelte:head>

<Page>
	<PostContent post={data.post} />
</Page>
