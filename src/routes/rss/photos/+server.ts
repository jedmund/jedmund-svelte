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

// Helper function to format RFC 822 date
function formatRFC822Date(date: Date): string {
	return date.toUTCString()
}

export const GET: RequestHandler = async (event) => {
	try {
		// Get published photography albums
		const albums = await prisma.album.findMany({
			where: {
				status: 'published',
				isPhotography: true
			},
			include: {
				photos: {
					where: {
						status: 'published',
						showInPhotos: true
					},
					orderBy: { displayOrder: 'asc' },
					take: 1 // Get first photo for cover image
				},
				_count: {
					select: {
						photos: {
							where: {
								status: 'published',
								showInPhotos: true
							}
						}
					}
				}
			},
			orderBy: { createdAt: 'desc' },
			take: 50 // Limit to most recent 50 albums
		})

		// Get individual published photos not in albums
		const standalonePhotos = await prisma.photo.findMany({
			where: {
				status: 'published',
				showInPhotos: true,
				albumId: null
			},
			orderBy: { publishedAt: 'desc' },
			take: 25
		})

		// Combine albums and standalone photos
		const items = [
			...albums.map((album) => ({
				type: 'album',
				id: album.id.toString(),
				title: album.title,
				description:
					album.description ||
					`Photography album${album.location ? ` from ${album.location}` : ''} with ${album._count.photos} photo${album._count.photos !== 1 ? 's' : ''}`,
				content: album.description ? `<p>${escapeXML(album.description)}</p>` : '',
				link: `${event.url.origin}/photos/${album.slug}`,
				pubDate: album.createdAt,
				updatedDate: album.updatedAt,
				guid: `${event.url.origin}/photos/${album.slug}`,
				photoCount: album._count.photos,
				coverPhoto: album.photos[0],
				location: album.location,
				date: album.date
			})),
			...standalonePhotos.map((photo) => ({
				type: 'photo',
				id: photo.id.toString(),
				title: photo.title || photo.filename,
				description: photo.description || photo.caption || `Photo: ${photo.filename}`,
				content: photo.description
					? `<p>${escapeXML(photo.description)}</p>`
					: photo.caption
						? `<p>${escapeXML(photo.caption)}</p>`
						: '',
				link: `${event.url.origin}/photos/photo/${photo.slug || photo.id}`,
				pubDate: photo.publishedAt || photo.createdAt,
				updatedDate: photo.updatedAt,
				guid: `${event.url.origin}/photos/photo/${photo.slug || photo.id}`,
				url: photo.url,
				thumbnailUrl: photo.thumbnailUrl
			}))
		].sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())

		const now = new Date()
		const lastBuildDate = formatRFC822Date(now)

		// Build RSS XML following best practices
		const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
<title>Photos - jedmund.com</title>
<description>Photography and visual content from jedmund</description>
<link>${event.url.origin}/photos</link>
<atom:link href="${event.url.origin}/rss/photos" rel="self" type="application/rss+xml"/>
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
<category>${item.type}</category>
${
	item.type === 'album' && item.coverPhoto
		? `
<enclosure url="${event.url.origin}${item.coverPhoto.url}" type="image/jpeg" length="0"/>
<media:thumbnail url="${event.url.origin}${item.coverPhoto.thumbnailUrl || item.coverPhoto.url}"/>
<media:content url="${event.url.origin}${item.coverPhoto.url}" type="image/jpeg"/>`
		: ''
}
${
	item.type === 'photo'
		? `
<enclosure url="${event.url.origin}${item.url}" type="image/jpeg" length="0"/>
<media:thumbnail url="${event.url.origin}${item.thumbnailUrl || item.url}"/>
<media:content url="${event.url.origin}${item.url}" type="image/jpeg"/>`
		: ''
}
${item.location ? `<category domain="location">${escapeXML(item.location)}</category>` : ''}
<author>noreply@jedmund.com (Justin Edmund)</author>
</item>`
	)
	.join('')}
</channel>
</rss>`

		logger.info('Photos RSS feed generated', { itemCount: items.length })

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
		logger.error('Failed to generate Photos RSS feed', error as Error)
		return new Response('Failed to generate RSS feed', { status: 500 })
	}
}
