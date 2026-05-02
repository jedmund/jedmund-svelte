import type { RequestHandler } from './$types'
import { Prisma } from '@prisma/client'
import { prisma } from '$lib/server/database'
import { logger } from '$lib/server/logger'
import {
	escapeXML,
	formatRFC822Date,
	extractTextSummary,
	convertContentToHTML
} from '$lib/server/rss/helpers'

export const GET: RequestHandler = async (event) => {
	try {
		// Get published posts
		const posts = await prisma.post.findMany({
			where: {
				status: 'published',
				publishedAt: { not: null }
			},
			orderBy: { publishedAt: 'desc' },
			take: 50
		})

		// Get published albums that show in universe
		const albums = await prisma.album.findMany({
			where: {
				status: 'published',
				showInUniverse: true
			},
			include: {
				_count: {
					select: { media: true }
				}
			},
			orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
			take: 25
		})

		// Get published garden items with notes that opt into the Everything feed
		const gardenItems = await prisma.gardenItem.findMany({
			where: {
				status: 'published',
				showInUniverse: true,
				note: { not: Prisma.DbNull }
			},
			orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
			take: 50
		})

		// Combine and sort by date
		const items = [
			...posts.map((post) => ({
				type: 'post' as const,
				section: 'universe',
				id: post.id.toString(),
				title:
					post.title ||
					new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', {
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
			...albums.map((album) => ({
				type: 'album' as const,
				section: 'photos',
				id: album.id.toString(),
				title: album.title,
				description:
					album.description ||
					`Photo album with ${album._count.media} photo${album._count.media !== 1 ? 's' : ''}`,
				content: album.description ? `<p>${escapeXML(album.description)}</p>` : '',
				link: `${event.url.origin}/photos/${album.slug}`,
				guid: `${event.url.origin}/photos/${album.slug}`,
				pubDate: album.publishedAt || album.createdAt,
				updatedDate: album.updatedAt,
				postType: 'album' as const,
				featuredImage: null
			})),
			...gardenItems.map((item) => ({
				type: 'garden' as const,
				section: 'garden',
				id: item.id.toString(),
				title: item.title,
				description: extractTextSummary(item.note) || item.summary || '',
				content: convertContentToHTML(item.note),
				link: `${event.url.origin}/garden/${item.category}/${item.slug}`,
				guid: `${event.url.origin}/garden/${item.category}/${item.slug}`,
				pubDate: item.publishedAt || item.createdAt,
				updatedDate: item.updatedAt,
				postType: item.category,
				featuredImage: item.imageUrl
			}))
		].sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())

		const now = new Date()
		const lastBuildDate = formatRFC822Date(now)

		// Build RSS XML
		const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet href="/rss.xsl" type="text/xsl"?>
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

		logger.info('RSS feed generated', { itemCount: items.length })

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
				'Content-Type': 'application/xml; charset=utf-8',
				'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=86400',
				'Last-Modified': lastBuildDate,
				ETag: etag,
				'X-Content-Type-Options': 'nosniff',
				Vary: 'Accept-Encoding',
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
				'Access-Control-Max-Age': '86400'
			}
		})
	} catch (error) {
		logger.error('Failed to generate RSS feed', error as Error)
		return new Response('Failed to generate RSS feed', { status: 500 })
	}
}
