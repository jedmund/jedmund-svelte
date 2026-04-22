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
		const items = await prisma.gardenItem.findMany({
			where: {
				status: 'published',
				note: { not: Prisma.DbNull }
			},
			orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
			take: 50
		})

		const now = new Date()
		const lastBuildDate = formatRFC822Date(now)

		const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet href="/rss.xsl" type="text/xsl"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
<title>Garden - jedmund.com</title>
<description>Books, movies, games, music, TV, and manga I've been enjoying, with notes and ratings.</description>
<link>${event.url.origin}/garden</link>
<atom:link href="${event.url.origin}/rss/garden" rel="self" type="application/rss+xml"/>
<language>en-us</language>
<lastBuildDate>${lastBuildDate}</lastBuildDate>
<managingEditor>noreply@jedmund.com (Justin Edmund)</managingEditor>
<webMaster>noreply@jedmund.com (Justin Edmund)</webMaster>
<generator>SvelteKit RSS Generator</generator>
<docs>https://cyber.harvard.edu/rss/rss.html</docs>
<ttl>60</ttl>
${items
	.map((item) => {
		const link = `${event.url.origin}/garden/${item.category}/${item.slug}`
		const description = extractTextSummary(item.note) || item.summary || ''
		const content = convertContentToHTML(item.note)
		const pubDate = item.publishedAt || item.createdAt
		const imageUrl = item.imageUrl
			? item.imageUrl.startsWith('http')
				? item.imageUrl
				: event.url.origin + item.imageUrl
			: null

		return `
<item>
<title>${escapeXML(item.title)}</title>
<description><![CDATA[${description}]]></description>
${content ? `<content:encoded><![CDATA[${content}]]></content:encoded>` : ''}
<link>${link}</link>
<guid isPermaLink="true">${link}</guid>
<pubDate>${formatRFC822Date(new Date(pubDate))}</pubDate>
<atom:updated>${new Date(item.updatedAt).toISOString()}</atom:updated>
<category>${escapeXML(item.category)}</category>
${item.creator ? `<category domain="creator">${escapeXML(item.creator)}</category>` : ''}
${item.rating ? `<category domain="rating">${item.rating}/5</category>` : ''}
${item.isFavorite ? `<category>favorite</category>` : ''}
${item.isCurrent ? `<category>current</category>` : ''}
${
	imageUrl
		? `
<enclosure url="${imageUrl}" type="image/jpeg" length="0"/>
<media:content url="${imageUrl}" type="image/jpeg"/>`
		: ''
}
<author>noreply@jedmund.com (Justin Edmund)</author>
</item>`
	})
	.join('')}
</channel>
</rss>`

		logger.info('Garden RSS feed generated', { itemCount: items.length })

		return new Response(rssXml, {
			headers: {
				'Content-Type': 'application/xml; charset=utf-8',
				'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
				'Last-Modified': lastBuildDate,
				ETag: `"${Buffer.from(rssXml).toString('base64').slice(0, 16)}"`,
				'X-Content-Type-Options': 'nosniff',
				Vary: 'Accept-Encoding'
			}
		})
	} catch (error) {
		logger.error('Failed to generate Garden RSS feed', error as Error)
		return new Response('Failed to generate RSS feed', { status: 500 })
	}
}
