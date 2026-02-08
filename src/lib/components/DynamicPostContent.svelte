<script lang="ts">
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
	<header class="post-header">
		<div class="post-meta">
			<a href="/universe/{post.slug}" class="post-date-link">
				<time class="post-date" datetime={publishedAtStr}>
					{publishedAtStr ? formatDate(publishedAtStr) : ''}
				</time>
			</a>
		</div>

		{#if post.title}
			<h1 class="post-title">{post.title}</h1>
		{/if}
	</header>

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
		<div class="post-body">
			{@html renderedContent}
		</div>
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

		// Post type styles
		&.post {
			.post-body {
				font-size: 1rem;
			}
		}

		&.essay {
			max-width: 100%; // Full width for essays

			.post-body {
				font-size: 1rem;
				line-height: 1.4;
			}
		}
	}

	.post-header {
		display: flex;
		flex-direction: column;
		gap: $unit-2x;
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

	.post-body {
		color: $text-color;
		line-height: 1.5;

		:global(h1) {
			margin: $unit-5x 0 $unit-3x;
			font-size: 2rem;
			font-weight: 600;
			color: $text-color;
		}

		:global(h2) {
			margin: $unit-4x 0 $unit-2x;
			font-size: 1.5rem;
			font-weight: 600;
			color: $text-color;
		}

		:global(h3) {
			margin: $unit-3x 0 $unit-2x;
			font-size: 1.25rem;
			font-weight: 600;
			color: $text-color;
		}

		:global(h4) {
			margin: $unit-3x 0 $unit-2x;
			font-size: 1rem;
			font-weight: 600;
			color: $text-color;
		}

		:global(p) {
			margin: 0 0 $unit-3x;
		}

		:global(p:last-child) {
			margin-bottom: 0;
		}

		:global(ul),
		:global(ol) {
			margin: 0 0 $unit-3x;
			padding-left: $unit-3x;
		}

		:global(ul li),
		:global(ol li) {
			margin-bottom: $unit;

			:global(p) {
				margin: 0;
			}
		}

		:global(blockquote) {
			margin: $unit-4x 0;
			padding: $unit-3x;
			background: $gray-97;
			border-left: 4px solid $gray-80;
			border-radius: $unit;
			color: $text-color;
			font-style: italic;

			:global(p:last-child) {
				margin-bottom: 0;
			}
		}

		:global(code) {
			background: $gray-95;
			padding: 2px 6px;
			border-radius: 4px;
			font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New',
				monospace;
			font-size: 0.9em;
			color: $text-color;
		}

		:global(pre) {
			background: $gray-95;
			padding: $unit-3x;
			border-radius: $unit;
			overflow-x: auto;
			margin: 0 0 $unit-3x;
			border: 1px solid $gray-85;

			:global(code) {
				background: none;
				padding: 0;
				font-size: 0.875rem;
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

		:global(hr) {
			border: none;
			border-top: 1px solid $gray-85;
			margin: $unit-4x 0;
		}

		:global(em) {
			font-style: italic;
		}

		:global(strong) {
			font-weight: 600;
			color: $text-color;
		}

		:global(figure) {
			margin: $unit-4x 0;

			:global(img) {
				width: 100%;
				height: auto;
				border-radius: $unit;
			}
		}

		// URL Embed styles
		:global(.url-embed-rendered) {
			margin: $unit-2x 0;
			width: 100%;

			&:first-child {
				margin-top: 0;
			}
		}

		:global(.url-embed-link) {
			display: flex;
			flex-direction: column;
			background: $gray-97;
			border-radius: $card-corner-radius;
			overflow: hidden;
			border: 1px solid $gray-80;
			text-decoration: none;
			transition: all 0.2s ease;
			width: 100%;

			&:hover {
				border-color: $gray-80;
				transform: translateY(-1px);
				text-decoration: none;
				box-shadow: 0 0px 8px rgba(0, 0, 0, 0.08);
			}
		}

		:global(.url-embed-image) {
			width: 100%;
			aspect-ratio: 2 / 1;
			overflow: hidden;
			background: $gray-90;
		}

		:global(.url-embed-image img) {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}

		:global(.url-embed-text) {
			flex: 1;
			padding: $unit-2x $unit-3x $unit-3x;
			display: flex;
			flex-direction: column;
			gap: $unit;
			min-width: 0;
		}

		:global(.url-embed-meta) {
			display: flex;
			align-items: center;
			gap: $unit-half;
			font-size: 0.8125rem;
			color: $gray-40;
		}

		:global(.url-embed-favicon) {
			width: 16px;
			height: 16px;
			flex-shrink: 0;
		}

		:global(.url-embed-domain) {
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			text-transform: lowercase;
		}

		:global(.url-embed-title) {
			margin: 0;
			font-size: 1.125rem;
			font-weight: 600;
			color: $gray-10;
			line-height: 1.3;
			display: -webkit-box;
			-webkit-box-orient: vertical;
			-webkit-line-clamp: 2;
			line-clamp: 2;
			overflow: hidden;
		}

		:global(.url-embed-description) {
			margin: 0;
			font-size: 0.9375rem;
			color: $gray-30;
			line-height: 1.5;
			display: -webkit-box;
			-webkit-box-orient: vertical;
			-webkit-line-clamp: 3;
			line-clamp: 3;
			overflow: hidden;
		}

		// YouTube embed styles
		:global(.url-embed-youtube) {
			margin: $unit-3x 0;
			border-radius: $card-corner-radius;
			overflow: hidden;
			background: $gray-95;
		}

		:global(.youtube-embed-wrapper) {
			position: relative;
			padding-bottom: 56.25%; // 16:9 aspect ratio
			height: 0;
			overflow: hidden;
		}

		:global(.youtube-embed-wrapper iframe) {
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			border: none;
		}
	}
</style>
