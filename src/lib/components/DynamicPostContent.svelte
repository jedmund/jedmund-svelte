<script lang="ts">
	import LinkCard from './LinkCard.svelte'
	import Slideshow from './Slideshow.svelte'
	import { formatDate } from '$lib/utils/date'
	import { renderEdraContent } from '$lib/utils/content'
	import { goto } from '$app/navigation'
	import ArrowLeft from '$icons/arrow-left.svg'

	let { post }: { post: any } = $props()

	const renderedContent = $derived(post.content ? renderEdraContent(post.content) : '')
</script>

<article class="post-content {post.postType}">
	<header class="post-header">
		<div class="post-meta">
			<a href="/universe/{post.slug}" class="post-date-link">
				<time class="post-date" datetime={post.publishedAt}>
					{formatDate(post.publishedAt)}
				</time>
			</a>
		</div>

		{#if post.title}
			<h1 class="post-title">{post.title}</h1>
		{/if}
	</header>

	{#if post.linkUrl}
		<div class="post-link-preview">
			<LinkCard
				link={{
					url: post.linkUrl,
					title: post.title,
					description: post.linkDescription
				}}
			/>
		</div>
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
				items={post.album.photos.map((photo) => ({
					url: photo.url,
					thumbnailUrl: photo.thumbnailUrl,
					caption: photo.caption,
					alt: photo.caption || post.album.title
				}))}
				alt={post.album.title}
				aspectRatio="4/3"
			/>
		</div>
	{:else if post.attachments && Array.isArray(post.attachments) && post.attachments.length > 0}
		<!-- Regular attachments -->
		<div class="post-attachments">
			<h3>Photos</h3>
			<Slideshow
				items={post.attachments.map((attachment) => ({
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
		<button onclick={() => goto('/universe')} class="back-button">
			<ArrowLeft class="back-arrow" />
			Back to Universe
		</button>
	</footer>
</article>

<style lang="scss">
	.post-content {
		display: flex;
		flex-direction: column;
		max-width: 784px;
		gap: $unit-3x;
		margin: 0 auto;
		padding: 0 $unit-3x;

		@include breakpoint('phone') {
			padding: 0 $unit-2x;
		}

		// Post type styles
		&.post {
			.post-body {
				font-size: 1rem;
			}
		}

		&.essay {
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
		color: $grey-40;
		font-weight: 400;
		transition: color 0.2s ease;
	}

	.post-title {
		margin: 0;
		font-size: 2.5rem;
		font-weight: 700;
		color: $grey-10;
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
			color: $grey-20;
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
			color: $grey-10;
			line-height: 1.5;
		}
	}

	.post-body {
		color: $grey-10;
		line-height: 1.5;

		:global(h1) {
			margin: $unit-5x 0 $unit-3x;
			font-size: 2rem;
			font-weight: 600;
			color: $grey-10;
		}

		:global(h2) {
			margin: $unit-4x 0 $unit-2x;
			font-size: 1.5rem;
			font-weight: 600;
			color: $grey-10;
		}

		:global(h3) {
			margin: $unit-3x 0 $unit-2x;
			font-size: 1.25rem;
			font-weight: 600;
			color: $grey-10;
		}

		:global(h4) {
			margin: $unit-3x 0 $unit-2x;
			font-size: 1rem;
			font-weight: 600;
			color: $grey-10;
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
		}

		:global(blockquote) {
			margin: $unit-4x 0;
			padding: $unit-3x;
			background: $grey-97;
			border-left: 4px solid $grey-80;
			border-radius: $unit;
			color: $grey-30;
			font-style: italic;

			:global(p:last-child) {
				margin-bottom: 0;
			}
		}

		:global(code) {
			background: $grey-95;
			padding: 2px 6px;
			border-radius: 4px;
			font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New',
				monospace;
			font-size: 0.9em;
			color: $grey-10;
		}

		:global(pre) {
			background: $grey-95;
			padding: $unit-3x;
			border-radius: $unit;
			overflow-x: auto;
			margin: 0 0 $unit-3x;
			border: 1px solid $grey-85;

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
				text-decoration-style: wavy;
				text-underline-offset: 0.15em;
			}
		}

		:global(hr) {
			border: none;
			border-top: 1px solid $grey-85;
			margin: $unit-4x 0;
		}

		:global(em) {
			font-style: italic;
		}

		:global(strong) {
			font-weight: 600;
			color: $grey-10;
		}

		:global(figure) {
			margin: $unit-4x 0;

			:global(img) {
				width: 100%;
				height: auto;
				border-radius: $unit;
			}
		}
	}

	.post-footer {
		padding-bottom: $unit-2x;
	}

	.back-button {
		color: $red-60;
		background-color: transparent;
		border: 1px solid transparent;
		font: inherit;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s ease;
		display: inline-flex;
		align-items: center;
		gap: $unit;
		border-radius: 24px;
		outline: none;

		&:hover:not(:disabled) :global(.back-arrow) {
			transform: translateX(-3px);
		}

		&:focus-visible {
			box-shadow: 0 0 0 3px rgba($red-60, 0.25);
		}

		:global(.back-arrow) {
			width: 16px;
			height: 16px;
			flex-shrink: 0;
			transition: transform 0.2s ease;
			margin-left: -$unit-half;

			:global(path) {
				stroke: currentColor;
				stroke-width: 2.25;
				stroke-linecap: round;
				stroke-linejoin: round;
				fill: none;
			}
		}
	}
</style>
