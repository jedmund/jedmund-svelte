import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse, checkAdminAuth } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'

// POST /api/albums/[id]/media - Add media to album (bulk operation)
export const POST: RequestHandler = async (event) => {
	// Check admin auth
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	try {
		const albumId = parseInt(event.params.id)
		const body = await event.request.json()
		const { mediaIds } = body

		if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
			return errorResponse('Media IDs are required', 400)
		}

		// Check if album exists
		const album = await prisma.album.findUnique({
			where: { id: albumId }
		})

		if (!album) {
			return errorResponse('Album not found', 404)
		}

		// Get current max display order
		const maxOrderResult = await prisma.albumMedia.findFirst({
			where: { albumId },
			orderBy: { displayOrder: 'desc' },
			select: { displayOrder: true }
		})

		let currentOrder = maxOrderResult?.displayOrder || 0

		// Create album-media associations
		const albumMediaData = mediaIds.map((mediaId: number) => ({
			albumId,
			mediaId,
			displayOrder: ++currentOrder
		}))

		// Use createMany with skipDuplicates to avoid errors if media already in album
		await prisma.albumMedia.createMany({
			data: albumMediaData,
			skipDuplicates: true
		})

		// Get updated count
		const updatedCount = await prisma.albumMedia.count({
			where: { albumId }
		})

		return jsonResponse({
			message: 'Media added to album successfully',
			mediaCount: updatedCount
		})
	} catch (error) {
		logger.error('Failed to add media to album', error as Error)
		return errorResponse('Failed to add media to album', 500)
	}
}

// DELETE /api/albums/[id]/media - Remove media from album (bulk operation)
export const DELETE: RequestHandler = async (event) => {
	// Check admin auth
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	try {
		const albumId = parseInt(event.params.id)
		const body = await event.request.json()
		const { mediaIds } = body

		if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
			return errorResponse('Media IDs are required', 400)
		}

		// Check if album exists
		const album = await prisma.album.findUnique({
			where: { id: albumId }
		})

		if (!album) {
			return errorResponse('Album not found', 404)
		}

		// Delete album-media associations
		await prisma.albumMedia.deleteMany({
			where: {
				albumId,
				mediaId: { in: mediaIds }
			}
		})

		// Get updated count
		const updatedCount = await prisma.albumMedia.count({
			where: { albumId }
		})

		// Reorder remaining media to fill gaps
		const remainingMedia = await prisma.albumMedia.findMany({
			where: { albumId },
			orderBy: { displayOrder: 'asc' }
		})

		// Update display order to remove gaps
		for (let i = 0; i < remainingMedia.length; i++) {
			if (remainingMedia[i].displayOrder !== i + 1) {
				await prisma.albumMedia.update({
					where: {
						albumId_mediaId: {
							albumId: remainingMedia[i].albumId,
							mediaId: remainingMedia[i].mediaId
						}
					},
					data: { displayOrder: i + 1 }
				})
			}
		}

		return jsonResponse({
			message: 'Media removed from album successfully',
			mediaCount: updatedCount
		})
	} catch (error) {
		logger.error('Failed to remove media from album', error as Error)
		return errorResponse('Failed to remove media from album', 500)
	}
}
