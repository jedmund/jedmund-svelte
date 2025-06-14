<script lang="ts">
	import UniverseCard from './UniverseCard.svelte'
	import { getContentExcerpt } from '$lib/utils/content'
	import { extractEmbeds } from '$lib/utils/extractEmbeds'
	import type { UniverseItem } from '../../routes/api/universe/+server'

	let { post }: { post: UniverseItem } = $props()

	// Extract embeds from content
	const embeds = $derived(post.content ? extractEmbeds(post.content) : [])
	const firstEmbed = $derived(embeds[0])

	// Check if content is truncated
	const isContentTruncated = $derived(() => {
		if (post.content) {
			// Check if the excerpt is shorter than the full content
			const excerpt = getContentExcerpt(post.content)
			return excerpt.endsWith('...')
		}
		return false
	})

	// Helper to get domain from URL
	const getDomain = (url: string) => {
		try {
			const urlObj = new URL(url)
			return urlObj.hostname.replace('www.', '')
		} catch {
			return ''
		}
	}
</script>

<UniverseCard item={post} type="post">
	{#if post.title}
		<h2 class="card-title">
			<a href="/universe/{post.slug}" class="card-title-link" tabindex="-1">{post.title}</a>
		</h2>
	{/if}

	{#if post.content}
		<div class="post-excerpt">
			<p>{getContentExcerpt(post.content, 150)}</p>
		</div>
	{/if}

	{#if firstEmbed}
		<div class="embed-preview">
			{#if firstEmbed.type === 'youtube' && firstEmbed.videoId}
				<div class="youtube-embed-preview">
					<div class="youtube-player">
						<iframe
							src="https://www.youtube.com/embed/{firstEmbed.videoId}"
							frameborder="0"
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
							allowfullscreen
							title="YouTube video player"
						></iframe>
					</div>
				</div>
			{:else}
				<a href="/universe/{post.slug}" class="url-embed-preview" tabindex="-1">
					{#if firstEmbed.image}
						<div class="embed-image">
							<img src={firstEmbed.image} alt={firstEmbed.title || 'Link preview'} />
						</div>
					{/if}
					<div class="embed-text">
						<div class="embed-meta">
							{#if firstEmbed.favicon}
								<img src={firstEmbed.favicon} alt="" class="embed-favicon" />
							{/if}
							<span class="embed-domain">{firstEmbed.siteName || getDomain(firstEmbed.url)}</span>
						</div>
						{#if firstEmbed.title}
							<h3 class="embed-title">{firstEmbed.title}</h3>
						{/if}
						{#if firstEmbed.description}
							<p class="embed-description">{firstEmbed.description}</p>
						{/if}
					</div>
				</a>
			{/if}
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
		border-radius: $card-corner-radius;
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
			color: $grey-10;
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

	// Embed preview styles
	.embed-preview {
		margin: $unit-2x 0;
	}

	.youtube-embed-preview {
		.youtube-player {
			position: relative;
			width: 100%;
			padding-bottom: 56%; // 16:9 aspect ratio
			height: 0;
			overflow: hidden;
			background: $grey-95;
			border-radius: $card-corner-radius;
			border: 1px solid $grey-85;

			iframe {
				position: absolute;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
				border: none;
				border-radius: $unit;
			}
		}
	}

	.url-embed-preview {
		display: flex;
		flex-direction: column;
		background: $grey-97;
		border-radius: $card-corner-radius;
		overflow: hidden;
		border: 1px solid $grey-80;
		text-decoration: none;
		transition: all 0.2s ease;
		width: 100%;

		&:hover {
			border-color: $grey-80;
			transform: translateY(-1px);
			box-shadow: 0 0 8px rgba(0, 0, 0, 0.08);
		}

		.embed-image {
			width: 100%;
			aspect-ratio: 2 / 1;
			overflow: hidden;
			background: $grey-90;

			img {
				width: 100%;
				height: 100%;
				object-fit: cover;
			}
		}

		.embed-text {
			flex: 1;
			padding: $unit-2x $unit-3x $unit-3x;
			display: flex;
			flex-direction: column;
			gap: $unit;
			min-width: 0;
		}

		.embed-meta {
			display: flex;
			align-items: center;
			gap: $unit-half;
			font-size: 0.8125rem;
			color: $grey-40;
		}

		.embed-favicon {
			width: 16px;
			height: 16px;
			flex-shrink: 0;
		}

		.embed-domain {
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			text-transform: lowercase;
		}

		.embed-title {
			margin: 0;
			font-size: 1.125rem;
			font-weight: 600;
			color: $grey-10;
			line-height: 1.3;
			display: -webkit-box;
			-webkit-box-orient: vertical;
			-webkit-line-clamp: 2;
			overflow: hidden;
		}

		.embed-description {
			margin: 0;
			font-size: 0.9375rem;
			color: $grey-30;
			line-height: 1.5;
			display: -webkit-box;
			-webkit-box-orient: vertical;
			-webkit-line-clamp: 3;
			overflow: hidden;
		}
	}
</style>
