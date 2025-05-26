<script lang="ts">
	import type { Post } from '$lib/posts'
	import ImagePost from './ImagePost.svelte'

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
	<div class="post-content">
		{#if post.title}
			<h2 class="post-title">
				<a href="/blog/{post.slug}" class="post-title-link">{post.title}</a>
			</h2>
		{/if}
		{#if post.type === 'image' && post.images}
			<div class="post-image">
				<ImagePost images={post.images} alt={post.title || 'Post image'} />
			</div>
		{/if}
		<div class="post-text">
			{#if post.excerpt}
				<p class="post-excerpt">{post.excerpt}</p>
			{/if}
			<a href="/blog/{post.slug}" class="post-date-link">
				<time class="post-date" datetime={post.date}>
					{formatDate(post.date)}
				</time>
			</a>
		</div>
	</div>
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
		
		&.image {
			.post-image {
				margin-bottom: $unit-2x;
			}
		}
	}

	.post-content {
		padding: $unit-3x;
		background: $grey-100;
		border-radius: $card-corner-radius;
	}
	
	.post-text {
		display: flex;
		flex-direction: column;
		gap: $unit;
	}

	.post-title {
		margin: 0 0 $unit-2x;
		font-size: 1.2rem;
		font-weight: 600;
	}
	
	.post-title-link {
		color: $red-60;
		text-decoration: none;
		transition: all 0.2s ease;
		
		&:hover {
			text-decoration: underline;
			text-decoration-style: wavy;
			text-underline-offset: 0.15em;
		}
	}

	.post-excerpt {
		margin: 0;
		color: $grey-00;
		font-size: 1rem;
		line-height: 1.3;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
		overflow: hidden;
	}
	
	.post-date-link {
		text-decoration: none;
		transition: all 0.2s ease;
		
		&:hover {
			.post-date {
				color: $red-60;
				text-decoration: underline;
				text-decoration-style: wavy;
				text-underline-offset: 0.15em;
			}
		}
	}

	.post-date {
		display: block;
		font-size: 1rem;
		color: $grey-40;
		font-weight: 400;
		transition: all 0.2s ease;
	}
</style>
