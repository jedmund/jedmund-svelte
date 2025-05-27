import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { deleteFile, extractPublicId } from '$lib/server/cloudinary'
import { jsonResponse, errorResponse, checkAdminAuth } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'

// DELETE /api/media/[id] - Delete a media item
export const DELETE: RequestHandler = async (event) => {
	// Check authentication
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	const id = parseInt(event.params.id)
	if (isNaN(id)) {
		return errorResponse('Invalid media ID', 400)
	}

	try {
		// Get the media item
		const media = await prisma.media.findUnique({
			where: { id }
		})

		if (!media) {
			return errorResponse('Media not found', 404)
		}

		// Check if media is in use
		if (media.usedIn && (media.usedIn as any[]).length > 0) {
			return errorResponse('Cannot delete media that is in use', 409)
		}

		// Delete from Cloudinary
		const publicId = extractPublicId(media.url)
		if (publicId) {
			const deleted = await deleteFile(publicId)
			if (!deleted) {
				logger.warn('Failed to delete from Cloudinary', { publicId, mediaId: id })
			}
		}

		// Delete from database
		await prisma.media.delete({
			where: { id }
		})

		logger.info('Media deleted', { id, filename: media.filename })

		return new Response(null, { status: 204 })
	} catch (error) {
		logger.error('Failed to delete media', error as Error)
		return errorResponse('Failed to delete media', 500)
	}
}
