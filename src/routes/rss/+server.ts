import type { RequestHandler } from './$types'
import type { Prisma } from '@prisma/client'
import { prisma } from '$lib/server/database'
import { logger } from '$lib/server/logger'
import { renderEdraContent } from '$lib/utils/content'

// Content node types for TipTap/Edra content
interface TextNode {
	type: 'text'
	text: string
	marks?: unknown[]
}

interface ParagraphNode {
	type: 'paragraph'
	content?: (TextNode | ContentNode)[]
}

interface ContentNode {
	type: string
	content?: ContentNode[]
	attrs?: Record<string, unknown>
}

interface DocContent {
	type: 'doc'
	content?: ContentNode[]
}

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
// Uses the same rendering logic as the website for consistency
function convertContentToHTML(content: Prisma.JsonValue): string {
	if (!content) return ''

	// Handle legacy content format (if it's just a string)
	if (typeof content === 'string') {
		return `<p>${escapeXML(content)}</p>`
	}

	// Use the existing renderEdraContent function which properly handles TipTap marks
	// including links, bold, italic, etc.
	return renderEdraContent(content)
}

// Helper function to extract text summary from content
function extractTextSummary(content: Prisma.JsonValue, maxLength: number = 300): string {
	if (!content) return ''

	let text = ''

	// Handle string content
	if (typeof content === 'string') {
		text = content
	}
	// Handle TipTap/Edra format
	else if (typeof content === 'object' && content !== null && 'type' in content && content.type === 'doc' && 'content' in content && Array.isArray(content.content)) {
		const docContent = content as unknown as DocContent
		text = docContent.content
			?.filter((node): node is ParagraphNode => node.type === 'paragraph')
			.map((node) => {
				if (node.content && Array.isArray(node.content)) {
					return node.content
						.filter((child): child is TextNode => 'type' in child && child.type === 'text')
						.map((child) => child.text || '')
						.join('')
				}
				return ''
			})
			.filter((t) => t.length > 0)
			.join(' ') || ''
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

		// Combine all content types
		const items = [
			...posts.map((post) => ({
				type: 'post' as const,
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
<category>${item.postType}</category>
${
	item.featuredImage
		? `
<enclosure url="${item.featuredImage.startsWith('http') ? item.featuredImage : event.url.origin + item.featuredImage}" type="image/jpeg" length="0"/>
<media:content url="${item.featuredImage.startsWith('http') ? item.featuredImage : event.url.origin + item.featuredImage}" type="image/jpeg"/>`
		: ''
}
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
