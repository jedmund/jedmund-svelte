import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { logger } from '$lib/server/logger'

// Helper function to escape XML special characters
function escapeXML(str: string): string {
	if (!str) return ''
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
}

// Helper function to convert content to HTML for full content
function convertContentToHTML(content: any): string {
	if (!content) return ''
	
	// Handle legacy content format (if it's just a string)
	if (typeof content === 'string') {
		return `<p>${escapeXML(content)}</p>`
	}
	
	// Handle TipTap/Edra format with doc root
	if (content.type === 'doc' && content.content && Array.isArray(content.content)) {
		return content.content
			.map((node: any) => {
				switch (node.type) {
					case 'paragraph':
						const text = extractTextFromNode(node)
						return text ? `<p>${text}</p>` : ''
					case 'heading':
						const headingText = extractTextFromNode(node)
						const level = node.attrs?.level || 2
						return headingText ? `<h${level}>${headingText}</h${level}>` : ''
					case 'bulletList':
					case 'orderedList':
						const listItems = (node.content || [])
							.map((item: any) => {
								if (item.type === 'listItem') {
									const itemText = extractTextFromNode(item)
									return itemText ? `<li>${itemText}</li>` : ''
								}
								return ''
							})
							.filter((item: string) => item)
							.join('')
						if (!listItems) return ''
						return node.type === 'orderedList' ? `<ol>${listItems}</ol>` : `<ul>${listItems}</ul>`
					case 'blockquote':
						const quoteText = extractTextFromNode(node)
						return quoteText ? `<blockquote>${quoteText}</blockquote>` : ''
					case 'codeBlock':
						const code = extractTextFromNode(node)
						return code ? `<pre><code>${code}</code></pre>` : ''
					case 'image':
						const src = node.attrs?.src || ''
						const alt = node.attrs?.alt || ''
						return src ? `<figure><img src="${escapeXML(src)}" alt="${escapeXML(alt)}" /></figure>` : ''
					case 'video':
						const videoSrc = node.attrs?.src || ''
						if (!videoSrc) return ''
						// Check if it's a YouTube URL
						const youtubeMatch = videoSrc.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)
						if (youtubeMatch) {
							const videoId = youtubeMatch[1]
							return `<div class="video-embed"><iframe width="560" height="315" src="https://www.youtube.com/embed/${escapeXML(videoId)}" frameborder="0" allowfullscreen></iframe><p><a href="${escapeXML(videoSrc)}">Watch on YouTube</a></p></div>`
						}
						// For other video sources, include a video tag
						return `<video controls><source src="${escapeXML(videoSrc)}" type="video/mp4">Your browser does not support the video tag. <a href="${escapeXML(videoSrc)}">Download video</a></video>`
					case 'urlEmbed':
						const embedUrl = node.attrs?.url || ''
						const embedTitle = node.attrs?.title || ''
						const embedDescription = node.attrs?.description || ''
						const embedImage = node.attrs?.image || ''
						const embedSiteName = node.attrs?.siteName || ''
						
						if (!embedUrl) return ''
						
						// Check if it's a YouTube URL
						const ytMatch = embedUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)
						if (ytMatch) {
							const videoId = ytMatch[1]
							let html = '<div class="url-embed youtube-embed">'
							html += `<iframe width="560" height="315" src="https://www.youtube.com/embed/${escapeXML(videoId)}" frameborder="0" allowfullscreen></iframe>`
							if (embedTitle) {
								html += `<h3><a href="${escapeXML(embedUrl)}">${escapeXML(embedTitle)}</a></h3>`
							}
							if (embedDescription) {
								html += `<p>${escapeXML(embedDescription)}</p>`
							}
							html += '</div>'
							return html
						}
						
						// Check if it's a Twitter/X URL
						const twitterMatch = embedUrl.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/)
						if (twitterMatch) {
							// For Twitter/X, we can't embed the actual tweet in RSS, but we can provide a nice preview
							let html = '<div class="url-embed twitter-embed">'
							if (embedImage) {
								html += `<img src="${escapeXML(embedImage)}" alt="Tweet preview" />`
							}
							html += '<div class="embed-content">'
							html += `<span class="site-name">𝕏 (Twitter)</span>`
							if (embedTitle || embedDescription) {
								html += `<p>${escapeXML(embedDescription || embedTitle || '')}</p>`
							}
							html += `<p><a href="${escapeXML(embedUrl)}">View on 𝕏</a></p>`
							html += '</div></div>'
							return html
						}
						
						// For other URL embeds, create a rich preview
						let html = '<div class="url-embed">'
						if (embedImage) {
							html += `<img src="${escapeXML(embedImage)}" alt="${escapeXML(embedTitle || '')}" />`
						}
						html += '<div class="embed-content">'
						if (embedSiteName) {
							html += `<span class="site-name">${escapeXML(embedSiteName)}</span>`
						}
						if (embedTitle) {
							html += `<h3><a href="${escapeXML(embedUrl)}">${escapeXML(embedTitle)}</a></h3>`
						}
						if (embedDescription) {
							html += `<p>${escapeXML(embedDescription)}</p>`
						}
						html += '</div></div>'
						return html
					case 'iframe':
						const iframeSrc = node.attrs?.src || ''
						const iframeWidth = node.attrs?.width || 560
						const iframeHeight = node.attrs?.height || 315
						if (!iframeSrc) return ''
						return `<iframe src="${escapeXML(iframeSrc)}" width="${iframeWidth}" height="${iframeHeight}" frameborder="0" allowfullscreen></iframe>`
					default:
						const defaultText = extractTextFromNode(node)
						return defaultText ? `<p>${defaultText}</p>` : ''
				}
			})
			.filter((html: string) => html)
			.join('\n')
	}
	
	return ''
}

// Helper to extract text from TipTap nodes
function extractTextFromNode(node: any): string {
	if (!node) return ''
	
	// Direct text content
	if (node.text) return escapeXML(node.text)
	
	// Nested content
	if (node.content && Array.isArray(node.content)) {
		return node.content
			.map((child: any) => {
				if (child.type === 'text') {
					return escapeXML(child.text || '')
				}
				return extractTextFromNode(child)
			})
			.join('')
	}
	
	return ''
}

// Helper function to extract text summary from content
function extractTextSummary(content: any, maxLength: number = 300): string {
	if (!content) return ''
	
	let text = ''
	
	// Handle string content
	if (typeof content === 'string') {
		text = content
	}
	// Handle TipTap/Edra format
	else if (content.type === 'doc' && content.content && Array.isArray(content.content)) {
		text = content.content
			.filter((node: any) => node.type === 'paragraph')
			.map((node: any) => {
				if (node.content && Array.isArray(node.content)) {
					return node.content
						.filter((child: any) => child.type === 'text')
						.map((child: any) => child.text || '')
						.join('')
				}
				return ''
			})
			.filter((t: string) => t)
			.join(' ')
	}
	
	// Clean up and truncate
	text = text.replace(/\s+/g, ' ').trim()
	return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

// Helper function to format RFC 822 date
function formatRFC822Date(date: Date): string {
	return date.toUTCString()
}

export const GET: RequestHandler = async (event) => {
	try {
		// Get published posts from Universe
		const posts = await prisma.post.findMany({
			where: {
				status: 'published',
				publishedAt: { not: null }
			},
			orderBy: { publishedAt: 'desc' },
			take: 25
		})

		// TODO: Re-enable albums once database schema is updated
		const universeAlbums: any[] = []
		const photoAlbums: any[] = []

		// Combine all content types
		const items = [
			...posts.map((post) => ({
				type: 'post',
				section: 'universe',
				id: post.id.toString(),
				title:
					post.title || new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', { 
						year: 'numeric', 
						month: 'long', 
						day: 'numeric' 
					}),
				description: extractTextSummary(post.content) || '',
				content: convertContentToHTML(post.content),
				link: `${event.url.origin}/universe/${post.slug}`,
				guid: `${event.url.origin}/universe/${post.slug}`,
				pubDate: post.publishedAt || post.createdAt,
				updatedDate: post.updatedAt,
				postType: post.postType,
				featuredImage: post.featuredImage || null
			})),
			...universeAlbums.map((album) => ({
				type: 'album',
				section: 'universe',
				id: album.id.toString(),
				title: album.title,
				description:
					album.description ||
					`Photo album with ${album._count.media} photo${album._count.media !== 1 ? 's' : ''}`,
				content: album.description ? `<p>${escapeXML(album.description)}</p>` : '',
				link: `${event.url.origin}/photos/${album.slug}`,
				guid: `${event.url.origin}/photos/${album.slug}`,
				pubDate: album.createdAt,
				updatedDate: album.updatedAt,
				photoCount: album._count.media,
				coverPhoto: album.media[0]?.media,
				location: album.location
			})),
			...photoAlbums
				.filter((album) => !universeAlbums.some((ua) => ua.id === album.id)) // Avoid duplicates
				.map((album) => ({
					type: 'album',
					section: 'photos',
					id: album.id.toString(),
					title: album.title,
					description:
						album.description ||
						`Photography album${album.location ? ` from ${album.location}` : ''} with ${album._count.media} photo${album._count.media !== 1 ? 's' : ''}`,
					content: album.description ? `<p>${escapeXML(album.description)}</p>` : '',
					link: `${event.url.origin}/photos/${album.slug}`,
					guid: `${event.url.origin}/photos/${album.slug}`,
					pubDate: album.createdAt,
					updatedDate: album.updatedAt,
					photoCount: album._count.media,
					coverPhoto: album.media[0]?.media,
					location: album.location,
					date: album.date
				}))
		].sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())

		const now = new Date()
		const lastBuildDate = formatRFC822Date(now)

		// Build RSS XML following best practices
		const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
<title>jedmund.com</title>
<description>Creative work, thoughts, and photography by Justin Edmund</description>
<link>${event.url.origin}/</link>
<atom:link href="${event.url.origin}/rss" rel="self" type="application/rss+xml"/>
<language>en-us</language>
<lastBuildDate>${lastBuildDate}</lastBuildDate>
<managingEditor>noreply@jedmund.com (Justin Edmund)</managingEditor>
<webMaster>noreply@jedmund.com (Justin Edmund)</webMaster>
<generator>SvelteKit RSS Generator</generator>
<docs>https://cyber.harvard.edu/rss/rss.html</docs>
<ttl>60</ttl>
${items
	.map(
		(item) => `
<item>
<title>${escapeXML(item.title)}</title>
<description><![CDATA[${item.description}]]></description>
${item.content ? `<content:encoded><![CDATA[${item.content}]]></content:encoded>` : ''}
<link>${item.link}</link>
<guid isPermaLink="true">${item.guid}</guid>
<pubDate>${formatRFC822Date(new Date(item.pubDate))}</pubDate>
${item.updatedDate ? `<atom:updated>${new Date(item.updatedDate).toISOString()}</atom:updated>` : ''}
<category>${item.section}</category>
<category>${item.type === 'post' ? item.postType : 'album'}</category>
${
	item.type === 'album' && item.coverPhoto
		? `
<enclosure url="${item.coverPhoto.url.startsWith('http') ? item.coverPhoto.url : event.url.origin + item.coverPhoto.url}" type="image/jpeg" length="${item.coverPhoto.size || 0}"/>
<media:thumbnail url="${(item.coverPhoto.thumbnailUrl || item.coverPhoto.url).startsWith('http') ? (item.coverPhoto.thumbnailUrl || item.coverPhoto.url) : event.url.origin + (item.coverPhoto.thumbnailUrl || item.coverPhoto.url)}"/>
<media:content url="${item.coverPhoto.url.startsWith('http') ? item.coverPhoto.url : event.url.origin + item.coverPhoto.url}" type="image/jpeg"/>`
		: item.type === 'post' && item.featuredImage
		? `
<enclosure url="${item.featuredImage.startsWith('http') ? item.featuredImage : event.url.origin + item.featuredImage}" type="image/jpeg" length="0"/>
<media:content url="${item.featuredImage.startsWith('http') ? item.featuredImage : event.url.origin + item.featuredImage}" type="image/jpeg"/>`
		: ''
}
${item.location ? `<category domain="location">${escapeXML(item.location)}</category>` : ''}
<author>noreply@jedmund.com (Justin Edmund)</author>
</item>`
	)
	.join('')}
</channel>
</rss>`

		logger.info('Combined RSS feed generated', { itemCount: items.length })

		// Generate ETag based on content
		const etag = `W/"${Buffer.from(rssXml).length}-${Date.now()}"`
		
		// Check for conditional requests
		const ifNoneMatch = event.request.headers.get('if-none-match')
		const ifModifiedSince = event.request.headers.get('if-modified-since')
		
		if (ifNoneMatch === etag) {
			return new Response(null, { status: 304 })
		}
		
		if (ifModifiedSince && new Date(ifModifiedSince) >= new Date(lastBuildDate)) {
			return new Response(null, { status: 304 })
		}

		return new Response(rssXml, {
			headers: {
				'Content-Type': 'application/rss+xml; charset=utf-8',
				'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=86400',
				'Last-Modified': lastBuildDate,
				'ETag': etag,
				'X-Content-Type-Options': 'nosniff',
				'Vary': 'Accept-Encoding',
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
				'Access-Control-Max-Age': '86400'
			}
		})
	} catch (error) {
		logger.error('Failed to generate combined RSS feed', error as Error)
		return new Response('Failed to generate RSS feed', { status: 500 })
	}
}
