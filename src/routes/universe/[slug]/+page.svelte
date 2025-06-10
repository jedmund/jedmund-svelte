<script lang="ts">
	import Page from '$components/Page.svelte'
	import DynamicPostContent from '$components/DynamicPostContent.svelte'
	import { getContentExcerpt } from '$lib/utils/content'
	import { goto } from '$app/navigation'
	import ArrowLeft from '$icons/arrow-left.svg'
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()

	const post = $derived(data.post)
	const error = $derived(data.error)
	const pageTitle = $derived(post?.title || 'Post')
	const description = $derived(
		post?.content
			? getContentExcerpt(post.content, 160)
			: `${post?.postType === 'essay' ? 'Essay' : 'Post'} by jedmund`
	)
</script>

<svelte:head>
	{#if post}
		<title>{pageTitle} - jedmund</title>
		<meta name="description" content={description} />

		<!-- Open Graph meta tags -->
		<meta property="og:title" content={pageTitle} />
		<meta property="og:description" content={description} />
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

<div class="universe-page-container">
	{#if error || !post}
		<Page>
			<div class="error-container">
				<div class="error-content">
					<h1>Post Not Found</h1>
					<p>{error || "The post you're looking for doesn't exist."}</p>
					<button onclick={() => goto('/universe')} class="back-button">
						<ArrowLeft class="back-arrow" />
						Back to Universe
					</button>
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

		.back-button {
			color: $red-60;
			background-color: transparent;
			border: 1px solid transparent;
			font: inherit;
			font-size: 0.875rem;
			font-weight: 500;
			cursor: pointer;
			transition: all 0.15s ease;
			display: inline-flex;
			align-items: center;
			gap: $unit;
			border-radius: 24px;
			outline: none;

			&:hover:not(:disabled) :global(.back-arrow) {
				transform: translateX(-3px);
			}

			&:focus-visible {
				box-shadow: 0 0 0 3px rgba($red-60, 0.25);
			}

			:global(.back-arrow) {
				width: 16px;
				height: 16px;
				flex-shrink: 0;
				transition: transform 0.2s ease;
				margin-left: -$unit-half;

				:global(path) {
					stroke: currentColor;
					stroke-width: 2.25;
					stroke-linecap: round;
					stroke-linejoin: round;
					fill: none;
				}
			}
		}
	}
</style>
