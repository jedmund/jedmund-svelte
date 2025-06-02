<script lang="ts">
	import Page from '$components/Page.svelte'
	import DynamicPostContent from '$components/DynamicPostContent.svelte'
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()

	const post = $derived(data.post)
	const error = $derived(data.error)
	const pageTitle = $derived(post?.title || 'Post')
</script>

<svelte:head>
	{#if post}
		<title>{pageTitle} - jedmund</title>
		<meta name="description" content={post.excerpt || `${post.postType === 'essay' ? 'Essay' : 'Post'} by jedmund`} />
		
		<!-- Open Graph meta tags -->
		<meta property="og:title" content={pageTitle} />
		<meta property="og:description" content={post.excerpt || `${post.postType === 'essay' ? 'Essay' : 'Post'} by jedmund`} />
		<meta property="og:type" content="article" />
		{#if post.attachments && post.attachments.length > 0}
			<meta property="og:image" content={post.attachments[0].url} />
		{/if}
		
		<!-- Article meta -->
		<meta property="article:published_time" content={post.publishedAt} />
		<meta property="article:author" content="jedmund" />
	{:else}
		<title>Post Not Found - jedmund</title>
	{/if}
</svelte:head>

{#if error || !post}
	<Page>
		<div class="error-container">
			<div class="error-content">
				<h1>Post Not Found</h1>
				<p>{error || 'The post you\'re looking for doesn\'t exist.'}</p>
				<a href="/universe" class="back-link">← Back to Universe</a>
			</div>
		</div>
	</Page>
{:else}
	<Page>
		<DynamicPostContent {post} />
	</Page>
{/if}

<style lang="scss">
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

		h1 {
			font-size: 2rem;
			font-weight: 600;
			margin: 0 0 $unit-2x;
			color: $red-60;
		}

		p {
			margin: 0 0 $unit-3x;
			color: $grey-40;
			line-height: 1.5;
		}

		.back-link {
			color: $red-60;
			text-decoration: none;
			font-weight: 500;
			transition: all 0.2s ease;

			&:hover {
				text-decoration: underline;
				text-decoration-style: wavy;
				text-underline-offset: 0.15em;
			}
		}
	}
</style>
