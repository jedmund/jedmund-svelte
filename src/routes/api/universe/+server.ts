import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'

export interface UniverseItem {
	id: number
	type: 'post' | 'album'
	slug: string
	title?: string
	excerpt?: string
	content?: any
	publishedAt: string
	createdAt: string
	
	// Post-specific fields
	postType?: string
	linkUrl?: string
	linkDescription?: string
	attachments?: any
	
	// Album-specific fields
	description?: string
	location?: string
	date?: string
	photosCount?: number
	coverPhoto?: any
}

// GET /api/universe - Get mixed feed of published posts and albums
export const GET: RequestHandler = async (event) => {
	try {
		const url = new URL(event.request.url)
		const limit = parseInt(url.searchParams.get('limit') || '20')
		const offset = parseInt(url.searchParams.get('offset') || '0')

		// Fetch published posts
		const posts = await prisma.post.findMany({
			where: { 
				status: 'published',
				publishedAt: { not: null }
			},
			select: {
				id: true,
				slug: true,
				postType: true,
				title: true,
				content: true,
				excerpt: true,
				linkUrl: true,
				linkDescription: true,
				attachments: true,
				publishedAt: true,
				createdAt: true
			},
			orderBy: { publishedAt: 'desc' }
		})

		// Fetch published albums marked for Universe
		const albums = await prisma.album.findMany({
			where: { 
				status: 'published',
				showInUniverse: true
			},
			select: {
				id: true,
				slug: true,
				title: true,
				description: true,
				date: true,
				location: true,
				createdAt: true,
				_count: {
					select: { photos: true }
				},
				photos: {
					take: 1,
					orderBy: { displayOrder: 'asc' },
					select: {
						id: true,
						url: true,
						thumbnailUrl: true,
						caption: true
					}
				}
			},
			orderBy: { createdAt: 'desc' }
		})

		// Transform posts to universe items
		const postItems: UniverseItem[] = posts.map(post => ({
			id: post.id,
			type: 'post' as const,
			slug: post.slug,
			title: post.title || undefined,
			excerpt: post.excerpt || undefined,
			content: post.content,
			postType: post.postType,
			linkUrl: post.linkUrl || undefined,
			linkDescription: post.linkDescription || undefined,
			attachments: post.attachments,
			publishedAt: post.publishedAt!.toISOString(),
			createdAt: post.createdAt.toISOString()
		}))

		// Transform albums to universe items
		const albumItems: UniverseItem[] = albums.map(album => ({
			id: album.id,
			type: 'album' as const,
			slug: album.slug,
			title: album.title,
			description: album.description || undefined,
			excerpt: album.description || undefined,
			location: album.location || undefined,
			date: album.date?.toISOString(),
			photosCount: album._count.photos,
			coverPhoto: album.photos[0] || null,
			publishedAt: album.createdAt.toISOString(), // Albums use createdAt as publishedAt
			createdAt: album.createdAt.toISOString()
		}))

		// Combine and sort by publishedAt
		const allItems = [...postItems, ...albumItems]
			.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

		// Apply pagination
		const paginatedItems = allItems.slice(offset, offset + limit)
		const hasMore = allItems.length > offset + limit

		const response = {
			items: paginatedItems,
			pagination: {
				total: allItems.length,
				limit,
				offset,
				hasMore
			}
		}

		return jsonResponse(response)
	} catch (error) {
		logger.error('Failed to fetch universe feed', error as Error)
		return errorResponse('Failed to fetch universe feed', 500)
	}
}