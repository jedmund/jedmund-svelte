import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse, checkAdminAuth } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'

// GET /api/albums - Get published photography albums (or all albums if admin)
export const GET: RequestHandler = async (event) => {
	try {
		const url = new URL(event.request.url)
		const limit = parseInt(url.searchParams.get('limit') || '50')
		const offset = parseInt(url.searchParams.get('offset') || '0')

		// Check if this is an admin request
		const isAdmin = checkAdminAuth(event)

		// Fetch albums - all for admin, only published for public
		const albums = await prisma.album.findMany({
			where: isAdmin
				? {}
				: {
						status: 'published'
					},
			include: {
				media: {
					orderBy: { displayOrder: 'asc' },
					take: 1, // Only need the first photo for cover
					include: {
						media: {
							select: {
								id: true,
								url: true,
								thumbnailUrl: true,
								width: true,
								height: true,
								dominantColor: true,
								colors: true,
								aspectRatio: true,
								photoCaption: true
							}
						}
					}
				},
				_count: {
					select: {
						media: true
					}
				}
			},
			orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
			skip: offset,
			take: limit
		})

		// Get total count for pagination
		const totalCount = await prisma.album.count({
			where: isAdmin
				? {}
				: {
						status: 'published'
					}
		})

		// Transform albums for response
		const transformedAlbums = albums.map((album) => ({
			id: album.id,
			slug: album.slug,
			title: album.title,
			description: album.description,
			date: album.date,
			location: album.location,
			photoCount: album._count.media,
			coverPhoto: album.media[0]?.media
				? {
						id: album.media[0].media.id,
						url: album.media[0].media.url,
						thumbnailUrl: album.media[0].media.thumbnailUrl,
						width: album.media[0].media.width,
						height: album.media[0].media.height,
						dominantColor: album.media[0].media.dominantColor,
						colors: album.media[0].media.colors,
						aspectRatio: album.media[0].media.aspectRatio,
						caption: album.media[0].media.photoCaption
					}
				: null,
			hasContent: !!album.content, // Indicates if album has composed content
			// Include additional fields for admin
			...(isAdmin
				? {
						status: album.status,
						showInUniverse: album.showInUniverse,
						publishedAt: album.publishedAt,
						createdAt: album.createdAt,
						updatedAt: album.updatedAt,
						coverPhotoId: album.coverPhotoId,
						photos: album.media.map((m) => ({
							id: m.media.id,
							url: m.media.url,
							thumbnailUrl: m.media.thumbnailUrl,
							caption: m.media.photoCaption
						})),
						_count: album._count
					}
				: {})
		}))

		const response = {
			albums: transformedAlbums,
			pagination: {
				total: totalCount,
				limit,
				offset,
				hasMore: offset + limit < totalCount
			}
		}

		return jsonResponse(response)
	} catch (error) {
		logger.error('Failed to fetch albums', error as Error)
		return errorResponse('Failed to fetch albums', 500)
	}
}

// POST /api/albums - Create a new album (admin only)
export const POST: RequestHandler = async (event) => {
	// Check admin auth
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	try {
		const body = await event.request.json()

		// Validate required fields
		if (!body.title || !body.slug) {
			return errorResponse('Title and slug are required', 400)
		}

		// Create the album
		const album = await prisma.album.create({
			data: {
				title: body.title,
				slug: body.slug,
				description: body.description || null,
				date: body.date ? new Date(body.date) : null,
				location: body.location || null,
				showInUniverse: body.showInUniverse ?? false,
				status: body.status || 'draft',
				content: body.content || null,
				publishedAt: body.status === 'published' ? new Date() : null
			}
		})

		return jsonResponse(album, 201)
	} catch (error) {
		logger.error('Failed to create album', error as Error)

		// Check for unique constraint violation
		if (error instanceof Error && error.message.includes('Unique constraint')) {
			return errorResponse('An album with this slug already exists', 409)
		}

		return errorResponse('Failed to create album', 500)
	}
}
