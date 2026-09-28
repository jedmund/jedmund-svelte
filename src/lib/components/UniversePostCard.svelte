<script lang="ts">
	import PostEmbedPreview from './public/PostEmbedPreview.svelte'
	import UniverseCard from './UniverseCard.svelte'
	import TagPill from './TagPill.svelte'
	import { renderEdraContent } from '$lib/utils/content'
	import { renderInlineExcerpt } from '$lib/utils/content/excerpts'
	import { extractEmbeds } from '$lib/utils/extractEmbeds'
	import { extractHeroMedia } from '$lib/utils/extractHeroMedia'
	import { hydrateAudioPlayers } from '$lib/utils/hydrate-audio-players'
	import type { UniverseItem } from '$lib/types/universe'

	let { post }: { post: UniverseItem } = $props()

	// Extract embeds from content
	const embeds = $derived(
		post.content
			? extractEmbeds(post.content as unknown as import('$lib/types/editor').TiptapNode)
			: []
	)
	const firstEmbed = $derived(embeds[0])

	// First image/video node from content, used as hero for essay posts where the
	// rendered preview is a text-only excerpt and inline media would otherwise be hidden.
	const heroMedia = $derived(
		post.postType === 'essay' && !firstEmbed && post.content
			? extractHeroMedia(post.content as unknown as import('$lib/types/editor').TiptapNode)
			: null
	)

	// First paragraph (inline marks/links preserved) for essay previews
	const essayExcerpt = $derived(
		post.postType === 'essay' && post.content
			? renderInlineExcerpt(post.content)
			: { html: '', truncated: false }
	)

	let excerptEl: HTMLDivElement | undefined = $state()
	$effect(() => {
		if (excerptEl && post.content) return hydrateAudioPlayers(excerptEl)
	})
</script>

<UniverseCard
	item={post as unknown as { slug: string; publishedAt: string; [key: string]: unknown }}
	type="post"
>
	{#if post.title}
		<h2 class="card-title">
			<a href="/universe/{post.slug}" class="card-title-link" tabindex="-1">{post.title}</a>
		</h2>
	{/if}

	{#if heroMedia}
		<a href="/universe/{post.slug}" class="hero-media" tabindex="-1">
			{#if heroMedia.type === 'video'}
				<video
					src={heroMedia.src}
					muted
					playsinline
					preload="metadata"
					aria-label={heroMedia.title ?? 'Video preview'}
				></video>
				<span class="hero-play" aria-hidden="true">
					<svg viewBox="0 0 24 24">
						<path
							d="M9 6 L19 12 L9 18 Z"
							fill="currentColor"
							stroke="currentColor"
							stroke-width="3"
							stroke-linejoin="round"
							stroke-linecap="round"
						/>
					</svg>
				</span>
			{:else}
				<img src={heroMedia.src} alt={heroMedia.alt ?? heroMedia.title ?? ''} loading="lazy" />
			{/if}
		</a>
	{/if}

	<PostEmbedPreview {firstEmbed} slug={post.slug} />
	{#if post.content}
		<div
			class="post-excerpt"
			class:post-excerpt--essay={post.postType === 'essay'}
			bind:this={excerptEl}
		>
			{#if post.postType === 'essay'}
				<p>
					{@html essayExcerpt.html}{#if essayExcerpt.truncated}&nbsp;...&nbsp;<a
							href="/universe/{post.slug}"
							class="read-more"
							tabindex="-1">Continue reading</a
						>{/if}
				</p>
			{:else}
				{@html renderEdraContent(post.content)}
			{/if}
		</div>
	{/if}

	{#if post.tags && post.tags.length > 0}
		<div class="post-tags">
			{#each post.tags as tag (tag.id)}
				<TagPill {tag} size="small" href="/universe?tags={tag.slug}" />
			{/each}
		</div>
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

	.post-excerpt {
		// Styles for full content (non-essays)
		:global(p) {
			margin: 0 0 $unit-2x;
			color: $gray-10;
			font-size: 1rem;
			line-height: 1.5;

			&:last-child {
				margin-bottom: 0;
			}
		}

		:global(a) {
			color: $red-60;
			text-decoration: none;
			transition: all 0.2s ease;

			&:hover {
				text-decoration: underline;
			}
		}

		:global(strong) {
			font-weight: 600;
		}

		:global(em) {
			font-style: italic;
		}

		&.post-excerpt--essay :global(p) {
			margin: 0;
		}

		// Hide embeds in the rendered content since we show them separately
		:global(.url-embed-rendered) {
			display: none;
		}

		:global(.audio-figure) {
			margin: $unit-2x 0;

			:global(figcaption) {
				font-size: $font-size-extra-small;
				color: $gray-40;
				margin-top: $unit;
				padding: 0 $unit-2x;
			}
		}
	}

	.post-tags {
		display: flex;
		flex-wrap: wrap;
		gap: $unit-half;
		margin-top: $unit-2x;
		margin-bottom: $unit-2x;
	}

	.attachments {
		margin-bottom: $unit-3x;

		.attachment-count {
			background: $gray-95;
			border: 1px solid $gray-85;
			border-radius: $unit;
			padding: $unit $unit-2x;
			font-size: 0.875rem;
			color: $gray-40;
			display: inline-block;
		}
	}

	.read-more {
		color: $red-60;
		text-decoration: none;
		font-size: inherit;
		font-weight: 500;
		transition: all 0.2s ease;

		&:hover {
			text-decoration: underline;
		}
	}

	// Hero media pulled from the first image/video node in content
	.hero-media {
		position: relative;
		display: block;
		width: 100%;
		margin-bottom: $unit-2x;
		border-radius: $image-corner-radius;
		overflow: hidden;
		background: $gray-95;
		border: 1px solid $gray-85;

		img,
		video {
			display: block;
			width: 100%;
			height: auto;
		}
	}

	.hero-play {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 56px;
		height: 56px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		background: rgba(0, 0, 0, 0.55);
		border-radius: 50%;
		pointer-events: none;

		svg {
			width: 28px;
			height: 28px;
		}
	}

	// Embed preview styles
</style>
