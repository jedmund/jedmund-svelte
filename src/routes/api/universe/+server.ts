import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'

export interface UniverseItem {
	id: number
	type: 'post' | 'album'
	slug: string
	title?: string
	content?: any
	publishedAt: string
	createdAt: string

	// Post-specific fields
	postType?: string
	attachments?: any
	featuredImage?: string

	// Album-specific fields
	description?: string
	location?: string
	date?: string
	photosCount?: number
	coverPhoto?: any
	photos?: any[]
	hasContent?: boolean
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
				attachments: true,
				featuredImage: true,
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
				content: true,
				createdAt: true,
				_count: {
					select: { media: true }
				},
				media: {
					take: 6, // Fetch enough for 5 thumbnails + 1 background
					orderBy: { displayOrder: 'asc' },
					include: {
						media: {
							select: {
								id: true,
								url: true,
								thumbnailUrl: true,
								photoCaption: true,
								width: true,
								height: true
							}
						}
					}
				}
			},
			orderBy: { createdAt: 'desc' }
		})

		// Transform posts to universe items
		const postItems: UniverseItem[] = posts.map((post) => ({
			id: post.id,
			type: 'post' as const,
			slug: post.slug,
			title: post.title || undefined,
			content: post.content,
			postType: post.postType,
			attachments: post.attachments,
			featuredImage: post.featuredImage || undefined,
			publishedAt: post.publishedAt!.toISOString(),
			createdAt: post.createdAt.toISOString()
		}))

		// Transform albums to universe items
		const albumItems: UniverseItem[] = albums.map((album) => {
			// Transform media through the join table
			const photos = album.media.map((albumMedia) => ({
				id: albumMedia.media.id,
				url: albumMedia.media.url,
				thumbnailUrl: albumMedia.media.thumbnailUrl,
				caption: albumMedia.media.photoCaption,
				width: albumMedia.media.width,
				height: albumMedia.media.height
			}))

			return {
				id: album.id,
				type: 'album' as const,
				slug: album.slug,
				title: album.title,
				description: album.description || undefined,
				location: album.location || undefined,
				date: album.date?.toISOString(),
				photosCount: album._count.media,
				coverPhoto: photos[0] || null, // Keep for backward compatibility
				photos: photos, // Add all photos for slideshow
				hasContent: !!album.content, // Add content indicator
				publishedAt: album.createdAt.toISOString(), // Albums use createdAt as publishedAt
				createdAt: album.createdAt.toISOString()
			}
		})

		// Combine and sort by publishedAt
		const allItems = [...postItems, ...albumItems].sort(
			(a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
		)

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
