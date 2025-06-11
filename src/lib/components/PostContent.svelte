<script lang="ts">
	import type { Post } from '$lib/posts'
	import ImagePost from './ImagePost.svelte'
	import LinkCard from './LinkCard.svelte'
	import BackButton from './BackButton.svelte'

	let { post }: { post: Post } = $props()

	const formatDate = (dateString: string) => {
		const date = new Date(dateString)
		return date.toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		})
	}
</script>

<article class="post-content {post.type}">
	<header class="post-header">
		{#if post.title}
			<h1 class="post-title">{post.title}</h1>
		{/if}
		<time class="post-date" datetime={post.date}>
			{formatDate(post.date)}
		</time>
	</header>

	{#if post.images && post.images.length > 0}
		<div class="post-images">
			<ImagePost images={post.images} alt={post.title || 'Post image'} />
		</div>
	{/if}

	{#if post.link}
		<div class="post-link-preview">
			<LinkCard link={post.link} />
		</div>
	{/if}

	<div class="post-body">
		{@html post.content}
	</div>

	<footer class="post-footer">
		<BackButton href="/universe" label="Back to all posts" />
	</footer>
</article>

<style lang="scss">
	.post-content {
		max-width: 784px;
		margin: 0 auto;

		// Post type styles for simplified post types
		&.post {
			.post-body {
				font-size: 1rem;
			}
		}

		&.essay {
			.post-body {
				font-size: 1rem;
				line-height: 1.5;
			}
		}

		// Legacy type support
		&.note,
		&.microblog {
			.post-body {
				font-size: 1rem;
			}
		}

		&.blog {
			.post-body {
				font-size: 1rem;
				line-height: 1.5;
			}
		}
	}

	// Content-specific styles
	.post-images {
		margin-bottom: $unit-4x;
	}

	.post-link-preview {
		margin-bottom: $unit-4x;
		max-width: 600px;
	}

	.post-header {
		margin-bottom: $unit-5x;
	}

	.post-title {
		margin: 0 0 $unit-2x;
		font-size: 2rem;
		font-weight: 600;
		color: $grey-20;
		line-height: 1.2;
	}

	.post-date {
		display: block;
		font-size: 0.9rem;
		color: $grey-40;
		font-weight: 400;
	}

	.post-body {
		color: $grey-10;
		line-height: 1.5;

		:global(h2) {
			margin: $unit-4x 0 $unit-2x;
			font-size: 1.5rem;
			font-weight: 600;
			color: $grey-20;
		}

		:global(h3) {
			margin: $unit-3x 0 $unit-2x;
			font-size: 1.2rem;
			font-weight: 600;
			color: $grey-20;
		}

		:global(p) {
			margin: 0 0 $unit-3x;
		}

		:global(ul),
		:global(ol) {
			margin: 0 0 $unit-3x;
			padding-left: $unit-3x;
		}

		:global(ul li),
		:global(ol li) {
			margin-bottom: $unit;
		}

		:global(blockquote) {
			margin: $unit-3x 0;
			padding-left: $unit-3x;
			border-left: 3px solid $grey-80;
			color: $grey-40;
			font-style: italic;
		}

		:global(code) {
			background: $grey-90;
			padding: 2px 6px;
			border-radius: 3px;
			font-family: 'SF Mono', Monaco, monospace;
			font-size: 0.9em;
		}

		:global(pre) {
			background: $grey-90;
			padding: $unit-2x;
			border-radius: $unit;
			overflow-x: auto;
			margin: 0 0 $unit-3x;
		}

		:global(pre code) {
			background: none;
			padding: 0;
		}

		:global(a) {
			color: $red-60;
			text-decoration: none;
			transition: all 0.2s ease;
		}

		:global(a:hover) {
			text-decoration: underline;
			text-decoration-style: wavy;
			text-underline-offset: 0.15em;
		}

		:global(hr) {
			border: none;
			border-top: 1px solid $grey-80;
			margin: $unit-4x 0;
		}

		:global(em) {
			font-style: italic;
			color: $grey-40;
		}
	}

	.post-footer {
		margin-top: $unit-6x;
		padding-top: $unit-4x;
		border-top: 1px solid $grey-80;
	}
</style>
