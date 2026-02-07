import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import {
	jsonResponse,
	errorResponse,
	checkAdminAuth,
	parseRequestBody
} from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'

// POST /api/albums/[id]/photos - Add media to an album
export const POST: RequestHandler = async (event) => {
	// Check authentication
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	const albumId = parseInt(event.params.id)
	if (isNaN(albumId)) {
		return errorResponse('Invalid album ID', 400)
	}

	try {
		const body = await parseRequestBody<{
			mediaId: number
			displayOrder?: number
		}>(event.request)

		if (!body || !body.mediaId) {
			return errorResponse('Media ID is required', 400)
		}

		// Check if album exists
		const album = await prisma.album.findUnique({
			where: { id: albumId }
		})

		if (!album) {
			return errorResponse('Album not found', 404)
		}

		// Check if media exists
		const media = await prisma.media.findUnique({
			where: { id: body.mediaId }
		})

		if (!media) {
			return errorResponse('Media not found', 404)
		}

		// Check if media is already an image type
		if (!media.mimeType.startsWith('image/')) {
			return errorResponse('Only images can be added to albums', 400)
		}

		// Check if media is already in this album
		const existing = await prisma.albumMedia.findUnique({
			where: {
				albumId_mediaId: {
					albumId: albumId,
					mediaId: body.mediaId
				}
			}
		})

		if (existing) {
			return errorResponse('Media is already in this album', 409)
		}

		// Get the next display order if not provided
		let displayOrder = body.displayOrder
		if (displayOrder === undefined) {
			const lastAlbumMedia = await prisma.albumMedia.findFirst({
				where: { albumId },
				orderBy: { displayOrder: 'desc' }
			})
			displayOrder = (lastAlbumMedia?.displayOrder || 0) + 1
		}

		// Create album-media relationship
		const albumMedia = await prisma.albumMedia.create({
			data: {
				albumId,
				mediaId: body.mediaId,
				displayOrder
			},
			include: {
				media: true
			}
		})

		// Track media usage
		await prisma.mediaUsage.create({
			data: {
				mediaId: body.mediaId,
				contentType: 'album',
				contentId: albumId,
				fieldName: 'photos'
			}
		})

		logger.info('Media added to album', {
			albumId,
			mediaId: body.mediaId
		})

		// Return media with album context
		return jsonResponse({
			id: albumMedia.media.id,
			mediaId: albumMedia.media.id,
			filename: albumMedia.media.filename,
			url: albumMedia.media.url,
			thumbnailUrl: albumMedia.media.thumbnailUrl,
			width: albumMedia.media.width,
			height: albumMedia.media.height,
			exifData: albumMedia.media.exifData,
			caption: albumMedia.media.photoCaption || albumMedia.media.description,
			displayOrder: albumMedia.displayOrder,
			media: albumMedia.media
		})
	} catch (error) {
		logger.error('Failed to add media to album', error as Error)
		return errorResponse('Failed to add media to album', 500)
	}
}

// PUT /api/albums/[id]/photos - Update media order in album
export const PUT: RequestHandler = async (event) => {
	// Check authentication
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	const albumId = parseInt(event.params.id)
	if (isNaN(albumId)) {
		return errorResponse('Invalid album ID', 400)
	}

	try {
		const body = await parseRequestBody<{
			mediaId: number // Changed from photoId for clarity
			displayOrder: number
		}>(event.request)

		// Also support legacy photoId parameter
		const mediaId = body?.mediaId || Number((body as Record<string, unknown>)?.photoId)
		if (!mediaId || isNaN(mediaId) || body?.displayOrder === undefined) {
			return errorResponse('Media ID and display order are required', 400)
		}

		// Check if album exists
		const album = await prisma.album.findUnique({
			where: { id: albumId }
		})

		if (!album) {
			return errorResponse('Album not found', 404)
		}

		// Update album-media display order
		const albumMedia = await prisma.albumMedia.update({
			where: {
				albumId_mediaId: {
					albumId: albumId,
					mediaId: mediaId
				}
			},
			data: {
				displayOrder: body.displayOrder
			},
			include: {
				media: true
			}
		})

		logger.info('Media order updated', {
			albumId,
			mediaId: mediaId,
			displayOrder: body.displayOrder
		})

		// Return in photo format for compatibility
		return jsonResponse({
			id: albumMedia.media.id,
			mediaId: albumMedia.media.id,
			displayOrder: albumMedia.displayOrder
		})
	} catch (error) {
		logger.error('Failed to update media order', error as Error)
		return errorResponse('Failed to update media order', 500)
	}
}

// DELETE /api/albums/[id]/photos - Remove media from an album (without deleting the media)
export const DELETE: RequestHandler = async (event) => {
	// Check authentication
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	const albumId = parseInt(event.params.id)
	if (isNaN(albumId)) {
		return errorResponse('Invalid album ID', 400)
	}

	try {
		const url = new URL(event.request.url)
		const mediaIdParam = url.searchParams.get('mediaId') || url.searchParams.get('photoId') // Support legacy param

		logger.info('DELETE media request', { albumId, mediaId: mediaIdParam })

		if (!mediaIdParam || isNaN(parseInt(mediaIdParam))) {
			return errorResponse('Media ID is required as query parameter', 400)
		}

		const mediaId = parseInt(mediaIdParam)

		// Check if album exists
		const album = await prisma.album.findUnique({
			where: { id: albumId }
		})

		if (!album) {
			logger.error('Album not found', undefined, { albumId })
			return errorResponse('Album not found', 404)
		}

		// Check if media exists in this album
		const albumMedia = await prisma.albumMedia.findUnique({
			where: {
				albumId_mediaId: {
					albumId: albumId,
					mediaId: mediaId
				}
			}
		})

		logger.info('AlbumMedia lookup result', { mediaId, albumId, found: !!albumMedia })

		if (!albumMedia) {
			logger.error('Media not found in album', undefined, { mediaId, albumId })
			return errorResponse('Media not found in this album', 404)
		}

		// Remove media usage record
		await prisma.mediaUsage.deleteMany({
			where: {
				mediaId: mediaId,
				contentType: 'album',
				contentId: albumId,
				fieldName: 'photos'
			}
		})

		// Delete the album-media relationship
		await prisma.albumMedia.delete({
			where: {
				albumId_mediaId: {
					albumId: albumId,
					mediaId: mediaId
				}
			}
		})

		logger.info('Media removed from album', {
			mediaId: mediaId,
			albumId: albumId
		})

		return new Response(null, { status: 204 })
	} catch (error) {
		logger.error('Failed to remove media from album', error as Error)
		return errorResponse('Failed to remove media from album', 500)
	}
}
