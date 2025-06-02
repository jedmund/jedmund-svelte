<script lang="ts">
	import LinkCard from './LinkCard.svelte'
	import Slideshow from './Slideshow.svelte'

	let { post }: { post: any } = $props()

	const formatDate = (dateString: string) => {
		const date = new Date(dateString)
		return date.toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		})
	}

	const getPostTypeLabel = (postType: string) => {
		switch (postType) {
			case 'post':
				return 'Post'
			case 'essay':
				return 'Essay'
			default:
				return 'Post'
		}
	}

	// Render Edra/BlockNote JSON content to HTML
	const renderEdraContent = (content: any): string => {
		if (!content) return ''

		// Handle both { blocks: [...] } and { content: [...] } formats
		const blocks = content.blocks || content.content || []
		if (!Array.isArray(blocks)) return ''

		const renderBlock = (block: any): string => {
			switch (block.type) {
				case 'heading':
					const level = block.attrs?.level || block.level || 1
					const headingText = block.content || block.text || ''
					return `<h${level}>${headingText}</h${level}>`

				case 'paragraph':
					const paragraphText = block.content || block.text || ''
					if (!paragraphText) return '<p><br></p>'
					return `<p>${paragraphText}</p>`

				case 'bulletList':
				case 'ul':
					const listItems = (block.content || [])
						.map((item: any) => {
							const itemText = item.content || item.text || ''
							return `<li>${itemText}</li>`
						})
						.join('')
					return `<ul>${listItems}</ul>`

				case 'orderedList':
				case 'ol':
					const orderedItems = (block.content || [])
						.map((item: any) => {
							const itemText = item.content || item.text || ''
							return `<li>${itemText}</li>`
						})
						.join('')
					return `<ol>${orderedItems}</ol>`

				case 'blockquote':
					const quoteText = block.content || block.text || ''
					return `<blockquote><p>${quoteText}</p></blockquote>`

				case 'codeBlock':
				case 'code':
					const codeText = block.content || block.text || ''
					const language = block.attrs?.language || block.language || ''
					return `<pre><code class="language-${language}">${codeText}</code></pre>`

				case 'image':
					const src = block.attrs?.src || block.src || ''
					const alt = block.attrs?.alt || block.alt || ''
					const caption = block.attrs?.caption || block.caption || ''
					return `<figure><img src="${src}" alt="${alt}" />${caption ? `<figcaption>${caption}</figcaption>` : ''}</figure>`

				case 'hr':
				case 'horizontalRule':
					return '<hr>'

				default:
					// For simple text content
					const text = block.content || block.text || ''
					if (text) {
						return `<p>${text}</p>`
					}
					return ''
			}
		}

		return blocks.map(renderBlock).join('')
	}

	const renderedContent = $derived(post.content ? renderEdraContent(post.content) : '')
</script>

<article class="post-content {post.postType}">
	<header class="post-header">
		<div class="post-meta">
			<span class="post-type-badge">
				{getPostTypeLabel(post.postType)}
			</span>
			<time class="post-date" datetime={post.publishedAt}>
				{formatDate(post.publishedAt)}
			</time>
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
				items={post.album.photos.map(photo => ({
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
				items={post.attachments.map(attachment => ({
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
	{:else if post.excerpt}
		<div class="post-body">
			<p>{post.excerpt}</p>
		</div>
	{/if}

	<footer class="post-footer">
		<a href="/universe" class="back-link">← Back to Universe</a>
	</footer>
</article>

<style lang="scss">
	.post-content {
		max-width: 784px;
		margin: 0 auto;
		padding: 0 $unit-3x;

		@include breakpoint('phone') {
			padding: 0 $unit-2x;
		}

		// Post type styles
		&.post {
			.post-body {
				font-size: 1.05rem;
			}
		}

		&.essay {
			.post-body {
				font-size: 1rem;
				line-height: 1.7;
			}
		}
	}

	.post-header {
		margin-bottom: $unit-5x;
	}

	.post-meta {
		display: flex;
		align-items: center;
		gap: $unit-2x;
		margin-bottom: $unit-3x;
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
		font-size: 0.9rem;
		color: $grey-40;
		font-weight: 400;
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
			font-size: 1.125rem;
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
			font-size: 0.9rem;
			color: $grey-40;
			line-height: 1.5;
		}
	}

	.post-body {
		color: $grey-20;
		line-height: 1.6;

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
			font-size: 1.125rem;
			font-weight: 600;
			color: $grey-10;
		}

		:global(p) {
			margin: 0 0 $unit-3x;
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
		margin-top: $unit-6x;
		padding-top: $unit-4x;
		border-top: 1px solid $grey-85;
	}

	.back-link {
		color: $red-60;
		text-decoration: none;
		font-weight: 500;
		transition: all 0.2s ease;

		&:hover {
			text-decoration: underline;
			text-decoration-style: wavy;
			text-underline-offset: 0.15em;
		}
	}
</style>
