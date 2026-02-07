<script lang="ts">
	import Page from '$components/Page.svelte'
	import BackButton from '$components/BackButton.svelte'
	import DynamicPostContent from '$components/DynamicPostContent.svelte'
	import { getContentExcerpt } from '$lib/utils/content'
	import { generateMetaTags, generateArticleJsonLd } from '$lib/utils/metadata'
	import { page } from '$app/stores'
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()

	const post = $derived(data.post)
	const error = $derived(data.error)
	const pageTitle = $derived(post?.title || 'Post')
	const description = $derived(
		post?.content
			? getContentExcerpt(post.content, 160)
			: `${post?.postType === 'essay' ? 'Essay' : 'Post'} by @jedmund`
	)
	const pageUrl = $derived($page.url.href)

	// Generate metadata
	const metaTags = $derived(
		post
			? generateMetaTags({
					title: pageTitle,
					description,
					url: pageUrl,
					type: 'article',
					image: post.attachments?.[0]?.url,
					publishedTime: post.publishedAt,
					author: 'Justin Edmund',
					section: post.postType === 'essay' ? 'Essays' : 'Posts',
					titleFormat:
						post.postType === 'essay' ? { type: 'by' } : { type: 'snippet', snippet: description }
				})
			: generateMetaTags({
					title: 'Post Not Found',
					description: 'The post you are looking for could not be found.',
					url: pageUrl,
					noindex: true
				})
	)

	// Generate article JSON-LD
	const articleJsonLd = $derived(
		post
			? generateArticleJsonLd({
					title: pageTitle,
					description,
					url: pageUrl,
					image: post.attachments?.[0]?.url,
					datePublished: post.publishedAt,
					dateModified: post.updatedAt || post.publishedAt,
					author: 'Justin Edmund'
				})
			: null
	)

	const articleJsonLdScript = $derived(
		// eslint-disable-next-line no-useless-escape -- Escape required for Svelte parser
		articleJsonLd ? `<script type="application/ld+json">${JSON.stringify(articleJsonLd)}<\/script>` : null
	)
</script>

<svelte:head>
	<title>{metaTags.title}</title>
	<meta name="description" content={metaTags.description} />

	<!-- OpenGraph -->
	{#each Object.entries(metaTags.openGraph) as [property, content]}
		<meta property="og:{property}" {content} />
	{/each}

	<!-- Twitter Card -->
	{#each Object.entries(metaTags.twitter) as [property, content]}
		<meta name="twitter:{property}" {content} />
	{/each}

	<!-- Other meta tags -->
	{#if metaTags.other.canonical}
		<link rel="canonical" href={metaTags.other.canonical} />
	{/if}
	{#if metaTags.other.robots}
		<meta name="robots" content={metaTags.other.robots} />
	{/if}

	<!-- JSON-LD -->
	{#if articleJsonLdScript}
		{@html articleJsonLdScript}
	{/if}
</svelte:head>

<div class="universe-page-container">
	{#if error || !post}
		<Page>
			<div class="error-container">
				<div class="error-content">
					<p>{error || "The post you're looking for doesn't exist."}</p>
					<BackButton href="/universe" label="Back to Universe" />
				</div>
			</div>
		</Page>
	{:else}
		<Page>
			<DynamicPostContent {post} />
		</Page>
	{/if}
</div>

<style lang="scss">
	.universe-page-container {
		padding: 0 $unit-2x;
		box-sizing: border-box;
	}

	.error-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 60vh;
		padding: $unit-6x $unit-3x;
	}

	.error-content {
		text-align: center;
		max-width: 500px;

		p {
			margin: 0 0 $unit-3x;
			color: $gray-40;
			line-height: 1.5;
		}
	}
</style>
