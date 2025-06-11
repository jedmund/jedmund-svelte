<script lang="ts">
	import type { Post } from '$lib/posts'
	import ImagePost from './ImagePost.svelte'
	import LinkCard from './LinkCard.svelte'
	import UniverseIcon from '$icons/universe.svg'

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
				<a href="/universe/{post.slug}" class="post-title-link">{post.title}</a>
			</h2>
		{/if}
		{#if post.type === 'image' && post.images}
			<div class="post-image">
				<ImagePost images={post.images} alt={post.title || 'Post image'} />
			</div>
		{/if}
		{#if post.type === 'link' && post.link}
			<div class="post-link">
				<LinkCard link={post.link} />
			</div>
		{/if}
		<div class="post-text">
			{#if post.excerpt}
				<p class="post-excerpt">{post.excerpt}</p>
			{/if}
			<div class="post-footer">
				<a href="/universe/{post.slug}" class="post-date-link">
					<time class="post-date" datetime={post.date}>
						{formatDate(post.date)}
					</time>
				</a>
				<UniverseIcon class="universe-icon" />
			</div>
		</div>
	</div>
</article>

<style lang="scss">
	.post-item {
		width: 100%;
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

		&.link {
			.post-link {
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
		line-height: 1.5;
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

	.post-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	:global(.universe-icon) {
		width: 16px;
		height: 16px;
		fill: $grey-40;
	}
</style>
