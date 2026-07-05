import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { getConfig } from '$lib/server/config'
import { logger } from '$lib/server/logger'

const STATIC_PATHS = ['/', '/about', '/universe', '/photos', '/albums', '/garden', '/labs']

export const GET: RequestHandler = async () => {
	try {
		const baseUrl = ((await getConfig('site.url')) || 'https://jedmund.com').replace(/\/$/, '')
		const now = new Date()

		const [posts, projects, gardenItems, albums, photos] = await Promise.all([
			prisma.post.findMany({
				where: { status: 'published', publishedAt: { lte: now } },
				select: { slug: true, updatedAt: true }
			}),
			prisma.project.findMany({
				where: { status: 'published', NOT: { publishedAt: { gt: now } } },
				select: { slug: true, updatedAt: true, projectType: true }
			}),
			prisma.gardenItem.findMany({
				where: { status: 'published', NOT: { publishedAt: { gt: now } } },
				select: { category: true, slug: true, updatedAt: true }
			}),
			prisma.album.findMany({
				where: { status: 'published', NOT: { publishedAt: { gt: now } } },
				select: { slug: true, updatedAt: true }
			}),
			prisma.media.findMany({
				where: { isPhotography: true, NOT: { photoPublishedAt: { gt: now } } },
				select: { id: true, updatedAt: true }
			})
		])

		const entries: Array<{ path: string; lastmod?: Date }> = [
			...STATIC_PATHS.map((path) => ({ path })),
			...posts.map((p) => ({ path: `/universe/${p.slug}`, lastmod: p.updatedAt })),
			...projects.map((p) => ({
				path: `/${p.projectType === 'labs' ? 'labs' : 'work'}/${p.slug}`,
				lastmod: p.updatedAt
			})),
			...gardenItems.map((g) => ({
				path: `/garden/${g.category}/${g.slug}`,
				lastmod: g.updatedAt
			})),
			...albums.map((a) => ({ path: `/albums/${a.slug}`, lastmod: a.updatedAt })),
			...photos.map((m) => ({ path: `/photos/${m.id}`, lastmod: m.updatedAt }))
		]

		const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
	.map(
		(entry) =>
			`<url><loc>${baseUrl}${entry.path}</loc>${
				entry.lastmod ? `<lastmod>${entry.lastmod.toISOString().slice(0, 10)}</lastmod>` : ''
			}</url>`
	)
	.join('\n')}
</urlset>`

		return new Response(xml, {
			headers: {
				'Content-Type': 'application/xml; charset=utf-8',
				'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
			}
		})
	} catch (error) {
		logger.error('Failed to generate sitemap', error as Error)
		return new Response('Failed to generate sitemap', { status: 500 })
	}
}
