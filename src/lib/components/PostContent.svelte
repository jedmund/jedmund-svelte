<script lang="ts">
	import type { Post } from '$lib/posts'
	import ImagePost from './ImagePost.svelte'

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

	{#if post.type === 'image' && post.images}
		<div class="post-images">
			<ImagePost images={post.images} alt={post.title || 'Post image'} />
		</div>
	{/if}

	<div class="post-body">
		{@html post.content}
	</div>

	<footer class="post-footer">
		<a href="/blog" class="back-link">← Back to all posts</a>
	</footer>
</article>

<style lang="scss">
	.post-content {
		max-width: 784px;
		margin: 0 auto;

		&.note {
			.post-body {
				font-size: 1.1rem;
			}
		}
		
		&.image {
			.post-images {
				margin-bottom: $unit-4x;
			}
		}
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
		color: $grey-20;
		line-height: 1.6;

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
</style>
