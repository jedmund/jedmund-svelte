<script lang="ts">
	import RenderedPostBody from './RenderedPostBody.svelte'
	import Slideshow from './Slideshow.svelte'
	import BackButton from './BackButton.svelte'
	import HeartButton from './HeartButton.svelte'
	import { formatDate } from '$lib/utils/date'
	import { renderEdraContent } from '$lib/utils/content'

	import type { Post } from '@prisma/client'

	interface AlbumPhoto {
		url: string
		thumbnailUrl?: string
		caption?: string
	}

	interface PostAlbum {
		title: string
		description?: string
		photos: AlbumPhoto[]
	}

	interface Attachment {
		url: string
		thumbnailUrl?: string
		caption?: string
	}

	type PostWithRelations = Post & {
		album?: PostAlbum | null
	}

	let { post }: { post: PostWithRelations } = $props()

	const renderedContent = $derived(post.content ? renderEdraContent(post.content) : '')
	const publishedAtStr = $derived(post.publishedAt ? post.publishedAt.toString() : '')
	const attachments = $derived(
		Array.isArray(post.attachments) ? (post.attachments as unknown as Attachment[]) : []
	)
</script>

<article class="post-content {post.postType}">
	<div class="post-meta">
		{#if publishedAtStr}
			<a href="/universe/{post.slug}" class="post-date-link">
				<time class="post-date" datetime={publishedAtStr}>
					{formatDate(publishedAtStr)}
				</time>
			</a>
		{:else}
			<span class="post-draft-label">Draft&nbsp;&middot;&nbsp;Only visible to you</span>
		{/if}
	</div>

	{#if post.title}
		<h1 class="post-title">{post.title}</h1>
	{/if}

	{#if post.album && post.album.photos && post.album.photos.length > 0}
		<!-- Album slideshow -->
		<div class="post-album">
			<div class="album-header">
				<h3>{post.album.title}</h3>
				{#if post.album.description}
					<p class="album-description">{post.album.description}</p>
				{/if}
			</div>
			<Slideshow
				items={post.album.photos.map((photo: AlbumPhoto) => ({
					url: photo.url,
					thumbnailUrl: photo.thumbnailUrl,
					caption: photo.caption,
					alt: photo.caption || post.album?.title || 'Photo'
				}))}
				alt={post.album.title}
				aspectRatio="4/3"
			/>
		</div>
	{:else if attachments.length > 0}
		<!-- Regular attachments -->
		<div class="post-attachments">
			<h3>Photos</h3>
			<Slideshow
				items={attachments.map((attachment: Attachment) => ({
					url: attachment.url,
					thumbnailUrl: attachment.thumbnailUrl,
					caption: attachment.caption,
					alt: attachment.caption || 'Photo'
				}))}
				alt="Post photos"
				aspectRatio="4/3"
			/>
		</div>
	{/if}

	{#if renderedContent}
		<RenderedPostBody html={renderedContent} essay={post.postType === 'essay'} />
	{/if}

	<footer class="post-footer">
		<BackButton href="/universe" label="Back to Universe" />
		<HeartButton path="universe/{post.slug}" />
	</footer>
</article>

<style lang="scss">
	.post-content {
		display: flex;
		flex-direction: column;
		width: 100%;
		gap: $unit-3x;
		margin: 0 auto;

		@include breakpoint('phone') {
			gap: $unit-2x;
			padding: $unit-half 0;
		}

		&.essay {
			max-width: 100%;
		}
	}

	.post-meta {
		display: flex;
		align-items: center;
		gap: $unit-2x;
	}

	.post-date-link {
		text-decoration: none;
		transition: color 0.2s ease;

		&:hover {
			.post-date {
				color: $red-60;
			}
		}
	}

	.post-date {
		font-size: 0.9rem;
		color: $text-color-subdued;
		font-weight: 400;
		transition: color 0.2s ease;
	}

	.post-draft-label {
		font-size: 0.9rem;
		color: $text-color-subdued;
		font-weight: 400;
	}

	.post-title {
		margin: 0;
		font-size: 2.5rem;
		font-weight: 700;
		color: $text-color;
		line-height: 1.2;

		@include breakpoint('phone') {
			font-size: 2rem;
		}
	}

	.post-link-preview {
		margin-bottom: $unit-4x;
		max-width: 600px;
	}

	.post-album,
	.post-attachments {
		margin-bottom: $unit-4x;

		h3 {
			font-size: 1rem;
			font-weight: 600;
			margin: 0 0 $unit-2x;
			color: $text-color;
		}
	}

	.album-header {
		margin-bottom: $unit-3x;

		h3 {
			margin-bottom: $unit;
		}

		.album-description {
			margin: 0;
			font-size: 1rem;
			color: $text-color;
			line-height: 1.5;
		}
	}

	.post-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
</style>
