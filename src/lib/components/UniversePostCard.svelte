<script lang="ts">
	import UniverseIcon from '$icons/universe.svg'
	import type { UniverseItem } from '../../routes/api/universe/+server'

	let { post }: { post: UniverseItem } = $props()

	const formatDate = (dateString: string) => {
		const date = new Date(dateString)
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		})
	}

	const getPostTypeLabel = (postType: string) => {
		switch (postType) {
			case 'post': return 'Post'
			case 'essay': return 'Essay'
			default: return 'Post'
		}
	}

	// Extract text content from Edra JSON for excerpt
	const getContentExcerpt = (content: any, maxLength = 200): string => {
		if (!content || !content.content) return ''

		const extractText = (node: any): string => {
			if (node.text) return node.text
			if (node.content && Array.isArray(node.content)) {
				return node.content.map(extractText).join(' ')
			}
			return ''
		}

		const text = content.content.map(extractText).join(' ').trim()
		if (text.length <= maxLength) return text
		return text.substring(0, maxLength).trim() + '...'
	}
</script>

<article class="universe-post-card">
	<div class="card-content">
		<div class="card-header">
			<div class="post-type-badge">
				{getPostTypeLabel(post.postType || 'post')}
			</div>
			<time class="post-date" datetime={post.publishedAt}>
				{formatDate(post.publishedAt)}
			</time>
		</div>

		{#if post.title}
			<h2 class="post-title">
				<a href="/universe/{post.slug}" class="post-title-link">{post.title}</a>
			</h2>
		{/if}

		{#if post.linkUrl}
			<!-- Link post type -->
			<div class="link-preview">
				<a href={post.linkUrl} target="_blank" rel="noopener noreferrer" class="link-url">
					{post.linkUrl}
				</a>
				{#if post.linkDescription}
					<p class="link-description">{post.linkDescription}</p>
				{/if}
			</div>
		{/if}

		<div class="post-excerpt">
			{#if post.excerpt}
				<p>{post.excerpt}</p>
			{:else if post.content}
				<p>{getContentExcerpt(post.content)}</p>
			{/if}
		</div>

		{#if post.attachments && Array.isArray(post.attachments) && post.attachments.length > 0}
			<div class="attachments">
				<div class="attachment-count">
					📎 {post.attachments.length} attachment{post.attachments.length > 1 ? 's' : ''}
				</div>
			</div>
		{/if}

		<div class="card-footer">
			<a href="/universe/{post.slug}" class="read-more">
				Read more →
			</a>
			<UniverseIcon class="universe-icon" />
		</div>
	</div>
</article>

<style lang="scss">
	.universe-post-card {
		width: 100%;
		max-width: 700px;
		margin: 0 auto;
	}

	.card-content {
		padding: $unit-4x;
		background: $grey-100;
		border-radius: $card-corner-radius;
		border: 1px solid $grey-95;
		transition: all 0.2s ease;

		&:hover {
			border-color: $grey-85;
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
		}
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: $unit-2x;
	}

	.post-type-badge {
		background: $blue-60;
		color: white;
		padding: $unit-half $unit-2x;
		border-radius: 50px;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.post-date {
		font-size: 0.875rem;
		color: $grey-40;
		font-weight: 400;
	}

	.post-title {
		margin: 0 0 $unit-3x;
		font-size: 1.375rem;
		font-weight: 600;
		line-height: 1.3;
	}

	.post-title-link {
		color: $grey-10;
		text-decoration: none;
		transition: all 0.2s ease;

		&:hover {
			color: $red-60;
			text-decoration: underline;
			text-decoration-style: wavy;
			text-underline-offset: 0.15em;
		}
	}

	.link-preview {
		background: $grey-97;
		border: 1px solid $grey-90;
		border-radius: $unit;
		padding: $unit-2x;
		margin-bottom: $unit-3x;

		.link-url {
			display: block;
			color: $blue-60;
			text-decoration: none;
			font-size: 0.875rem;
			margin-bottom: $unit;
			word-break: break-all;

			&:hover {
				text-decoration: underline;
			}
		}

		.link-description {
			margin: 0;
			color: $grey-30;
			font-size: 0.875rem;
			line-height: 1.4;
		}
	}

	.post-excerpt {
		margin-bottom: $unit-3x;

		p {
			margin: 0;
			color: $grey-20;
			font-size: 1rem;
			line-height: 1.5;
			display: -webkit-box;
			-webkit-box-orient: vertical;
			-webkit-line-clamp: 4;
			overflow: hidden;
		}
	}

	.attachments {
		margin-bottom: $unit-3x;

		.attachment-count {
			background: $grey-95;
			border: 1px solid $grey-85;
			border-radius: $unit;
			padding: $unit $unit-2x;
			font-size: 0.875rem;
			color: $grey-40;
			display: inline-block;
		}
	}

	.card-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: $unit-2x;
		border-top: 1px solid $grey-90;
	}

	.read-more {
		color: $red-60;
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.2s ease;

		&:hover {
			text-decoration: underline;
			text-decoration-style: wavy;
			text-underline-offset: 0.15em;
		}
	}

	:global(.universe-icon) {
		width: 16px;
		height: 16px;
		fill: $grey-40;
	}
</style>