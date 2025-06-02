<script lang="ts">
	import UniverseCard from './UniverseCard.svelte'
	import { getContentExcerpt } from '$lib/utils/content'
	import type { UniverseItem } from '../../routes/api/universe/+server'

	let { post }: { post: UniverseItem } = $props()

	// Check if content is truncated
	const isContentTruncated = $derived(() => {
		if (post.content) {
			// Check if the excerpt is shorter than the full content
			const excerpt = getContentExcerpt(post.content)
			return excerpt.endsWith('...')
		}
		return false
	})
</script>

<UniverseCard item={post} type="post">
	{#if post.title}
		<h2 class="card-title">
			<a href="/universe/{post.slug}" class="card-title-link" tabindex="-1">{post.title}</a>
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

	{#if post.content}
		<div class="post-excerpt">
			<p>{getContentExcerpt(post.content, 150)}</p>
		</div>
	{/if}

	{#if post.postType === 'essay' && isContentTruncated}
		<p>
			<a href="/universe/{post.slug}" class="read-more" tabindex="-1">Continue reading</a>
		</p>
	{/if}

	{#if post.attachments && Array.isArray(post.attachments) && post.attachments.length > 0}
		<div class="attachments">
			<div class="attachment-count">
				📎 {post.attachments.length} attachment{post.attachments.length > 1 ? 's' : ''}
			</div>
		</div>
	{/if}
</UniverseCard>

<style lang="scss">
	.card-title {
		margin: 0 0 $unit-3x;
		font-size: 1.375rem;
		font-weight: 600;
		line-height: 1.3;
	}

	.card-title-link {
		text-decoration: none;
		transition: all 0.2s ease;
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
		p {
			margin: 0;
			color: $grey-20;
			font-size: 1rem;
			line-height: 1.5;
			display: -webkit-box;
			-webkit-box-orient: vertical;
			-webkit-line-clamp: 2;
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

	.read-more {
		color: $red-60;
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.2s ease;
	}
</style>
