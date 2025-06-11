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
	if (!content || !content.blocks) return ''

	return content.blocks
		.map((block: any) => {
			switch (block.type) {
				case 'paragraph':
					return `<p>${escapeXML(block.content || '')}</p>`
				case 'heading':
					const level = block.level || 2
					return `<h${level}>${escapeXML(block.content || '')}</h${level}>`
				case 'list':
					const items = (block.content || [])
						.map((item: any) => `<li>${escapeXML(item)}</li>`)
						.join('')
					return block.listType === 'ordered' ? `<ol>${items}</ol>` : `<ul>${items}</ul>`
				default:
					return `<p>${escapeXML(block.content || '')}</p>`
			}
		})
		.join('\n')
}

// Helper function to extract text summary from content
function extractTextSummary(content: any, maxLength: number = 300): string {
	if (!content || !content.blocks) return ''

	const text = content.blocks
		.filter((block: any) => block.type === 'paragraph' && block.content)
		.map((block: any) => block.content)
		.join(' ')

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
			take: 50 // Limit to most recent 50 posts
		})

		// Get published albums that show in universe
		const albums = await prisma.album.findMany({
			where: {
				status: 'published',
				showInUniverse: true
			},
			include: {
				_count: {
					select: { photos: true }
				}
			},
			orderBy: { createdAt: 'desc' },
			take: 25 // Limit to most recent 25 albums
		})

		// Combine and sort by date
		const items = [
			...posts.map((post) => ({
				type: 'post',
				id: post.id.toString(),
				title:
					post.title || `${post.postType.charAt(0).toUpperCase() + post.postType.slice(1)} Post`,
				description: extractTextSummary(post.content) || '',
				content: convertContentToHTML(post.content),
				link: `${event.url.origin}/universe/${post.slug}`,
				guid: `${event.url.origin}/universe/${post.slug}`,
				pubDate: post.publishedAt || post.createdAt,
				updatedDate: post.updatedAt,
				postType: post.postType,
				featuredImage: post.featuredImage || null
			})),
			...albums.map((album) => ({
				type: 'album',
				id: album.id.toString(),
				title: album.title,
				description:
					album.description ||
					`Photo album with ${album._count.photos} photo${album._count.photos !== 1 ? 's' : ''}`,
				content: album.description ? `<p>${escapeXML(album.description)}</p>` : '',
				link: `${event.url.origin}/photos/${album.slug}`,
				guid: `${event.url.origin}/photos/${album.slug}`,
				pubDate: album.createdAt,
				updatedDate: album.updatedAt,
				photoCount: album._count.photos
			}))
		].sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())

		const now = new Date()
		const lastBuildDate = formatRFC822Date(now)

		// Build RSS XML following best practices
		const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
<title>Universe - jedmund.com</title>
<description>Posts and photo albums from jedmund's universe</description>
<link>${event.url.origin}/universe</link>
<atom:link href="${event.url.origin}/rss/universe" rel="self" type="application/rss+xml"/>
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
<category>${item.type === 'post' ? item.postType : 'album'}</category>
<author>noreply@jedmund.com (Justin Edmund)</author>
</item>`
	)
	.join('')}
</channel>
</rss>`

		logger.info('Universe RSS feed generated', { itemCount: items.length })

		return new Response(rssXml, {
			headers: {
				'Content-Type': 'application/rss+xml; charset=utf-8',
				'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
				'Last-Modified': lastBuildDate,
				ETag: `"${Buffer.from(rssXml).toString('base64').slice(0, 16)}"`,
				'X-Content-Type-Options': 'nosniff',
				Vary: 'Accept-Encoding'
			}
		})
	} catch (error) {
		logger.error('Failed to generate Universe RSS feed', error as Error)
		return new Response('Failed to generate RSS feed', { status: 500 })
	}
}
