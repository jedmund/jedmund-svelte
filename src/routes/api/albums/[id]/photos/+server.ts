import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse, checkAdminAuth, parseRequestBody } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'

// POST /api/albums/[id]/photos - Add a photo to an album
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

		// Get the next display order if not provided
		let displayOrder = body.displayOrder
		if (displayOrder === undefined) {
			const lastPhoto = await prisma.photo.findFirst({
				where: { albumId },
				orderBy: { displayOrder: 'desc' }
			})
			displayOrder = (lastPhoto?.displayOrder || 0) + 1
		}

		// Create photo record from media
		const photo = await prisma.photo.create({
			data: {
				albumId,
				filename: media.filename,
				url: media.url,
				thumbnailUrl: media.thumbnailUrl,
				width: media.width,
				height: media.height,
				caption: media.description, // Use media description as initial caption
				displayOrder,
				status: 'published', // Photos in albums are published by default
				showInPhotos: true
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

		logger.info('Photo added to album', { 
			albumId, 
			photoId: photo.id, 
			mediaId: body.mediaId 
		})

		// Return photo with media information for frontend compatibility
		const photoWithMedia = {
			...photo,
			mediaId: body.mediaId,
			altText: media.altText,
			description: media.description,
			isPhotography: media.isPhotography,
			mimeType: media.mimeType,
			size: media.size
		}

		return jsonResponse(photoWithMedia)
	} catch (error) {
		logger.error('Failed to add photo to album', error as Error)
		return errorResponse('Failed to add photo to album', 500)
	}
}

// PUT /api/albums/[id]/photos - Update photo order in album
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
			photoId: number
			displayOrder: number
		}>(event.request)

		if (!body || !body.photoId || body.displayOrder === undefined) {
			return errorResponse('Photo ID and display order are required', 400)
		}

		// Check if album exists
		const album = await prisma.album.findUnique({
			where: { id: albumId }
		})

		if (!album) {
			return errorResponse('Album not found', 404)
		}

		// Update photo display order
		const photo = await prisma.photo.update({
			where: { 
				id: body.photoId,
				albumId // Ensure photo belongs to this album
			},
			data: {
				displayOrder: body.displayOrder
			}
		})

		logger.info('Photo order updated', { 
			albumId, 
			photoId: body.photoId, 
			displayOrder: body.displayOrder 
		})

		return jsonResponse(photo)
	} catch (error) {
		logger.error('Failed to update photo order', error as Error)
		return errorResponse('Failed to update photo order', 500)
	}
}