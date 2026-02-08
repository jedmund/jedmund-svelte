<script lang="ts">
	import TagPill from './TagPill.svelte'

	interface Tag {
		id: number
		name: string
		displayName: string
		slug: string
	}

	interface RelatedPost {
		id: number
		title: string | null
		slug: string
		excerpt: string | null
		publishedAt: string
		tags: Tag[]
		sharedTagsCount: number
	}

	interface RelatedPostsProps {
		postId: number
		tags: Array<{ id: number }>
		limit?: number
	}

	let { postId, tags, limit = 3 }: RelatedPostsProps = $props()

	let relatedPosts = $state<RelatedPost[]>([])
	let isLoading = $state(true)
	let error = $state<string | null>(null)

	$effect(() => {
		async function fetchRelatedPosts() {
			if (tags.length === 0) {
				relatedPosts = []
				isLoading = false
				return
			}

			try {
				isLoading = true
				const tagIds = tags.map((t) => t.id).join(',')
				const res = await fetch(
					`/api/posts/related?postId=${postId}&tagIds=${tagIds}&limit=${limit}`
				)

				if (!res.ok) throw new Error('Failed to fetch related posts')

				const data = await res.json()
				relatedPosts = data.posts
				error = null
			} catch (err) {
				console.error('Error fetching related posts:', err)
				error = 'Failed to load related posts'
				relatedPosts = []
			} finally {
				isLoading = false
			}
		}

		fetchRelatedPosts()
	})
</script>

{#if isLoading}
	<div class="related-posts-loading">
		<span class="spinner"></span>
		Loading related posts...
	</div>
{:else if error}
	<div class="related-posts-error">
		{error}
	</div>
{:else if relatedPosts.length > 0}
	<section class="related-posts">
		<h2>Related Posts</h2>
		<div class="related-posts-grid">
			{#each relatedPosts as post (post.id)}
				<article class="related-post-card">
					<a href="/posts/{post.slug}" class="related-post-link">
						<h3>{post.title || 'Untitled'}</h3>
						{#if post.excerpt}
							<p class="excerpt">{post.excerpt}</p>
						{/if}
						<div class="post-tags">
							{#each post.tags as tag (tag.id)}
								<TagPill {tag} size="small" />
							{/each}
						</div>
						<time datetime={post.publishedAt}>
							{new Date(post.publishedAt).toLocaleDateString()}
						</time>
					</a>
				</article>
			{/each}
		</div>
	</section>
{/if}

<style lang="scss">
	@import '$styles/variables';

	.related-posts {
		margin: $unit-6x 0;

		h2 {
			font-size: 1.5rem;
			margin-bottom: $unit-3x;
		}
	}

	.related-posts-grid {
		display: grid;
		gap: $unit-3x;

		@media (min-width: 768px) {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.related-post-card {
		border: 1px solid $gray-85;
		border-radius: $corner-radius-md;
		overflow: hidden;
		transition: all 0.2s ease;

		&:hover {
			border-color: $gray-70;
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		}
	}

	.related-post-link {
		display: block;
		padding: $unit-3x;
		text-decoration: none;
		color: inherit;

		h3 {
			font-size: 1.125rem;
			margin-bottom: $unit;
			color: $gray-10;
		}

		.excerpt {
			color: $gray-40;
			font-size: 0.875rem;
			margin-bottom: $unit-2x;
			line-height: 1.5;
		}

		.post-tags {
			display: flex;
			flex-wrap: wrap;
			gap: $unit-half;
			margin-bottom: $unit;
		}

		time {
			display: block;
			color: $gray-60;
			font-size: 0.75rem;
		}
	}

	.related-posts-loading,
	.related-posts-error {
		padding: $unit-3x;
		text-align: center;
		color: $gray-60;
	}

	.related-posts-loading {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: $unit;
	}

	.spinner {
		width: 20px;
		height: 20px;
		border: 2px solid $gray-90;
		border-top-color: $blue-50;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
