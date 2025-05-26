<script lang="ts">
	import type { Post } from '$lib/posts'

	let { post }: { post: Post } = $props()

	const formatDate = (dateString: string) => {
		const date = new Date(dateString)
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		})
	}
</script>

<article class="post-item {post.type}">
	<a href="/blog/{post.slug}" class="post-link">
		{#if post.title}
			<h2 class="post-title">{post.title}</h2>
		{/if}
		<p class="post-excerpt">{post.excerpt}</p>
		<time class="post-date" datetime={post.date}>
			{formatDate(post.date)}
		</time>
	</a>
</article>

<style lang="scss">
	.post-item {
		max-width: 700px;
		margin: 0 auto;

		&.note {
			.post-excerpt {
				font-size: 1rem;
			}
		}
	}

	.post-link {
		display: block;
		text-decoration: none;
		color: inherit;
		padding: $unit-3x;
		background: $grey-100;
		border-radius: $card-corner-radius;
		transition: all 0.2s ease;

		&:hover {
			// Hover styles can be added here if needed
		}
	}

	.post-title {
		margin: 0 0 $unit;
		font-size: 1.2rem;
		font-weight: 600;
		color: $red-60;
		transition: color 0.2s ease;
	}

	.post-excerpt {
		margin: 0 0 $unit-2x;
		color: $grey-00;
		font-size: 1rem;
		line-height: 1.3;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
		overflow: hidden;
	}

	.post-date {
		display: block;
		font-size: 1rem;
		color: $grey-40;
		font-weight: 400;
	}
</style>
