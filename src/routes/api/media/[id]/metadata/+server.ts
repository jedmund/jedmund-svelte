import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse, checkAdminAuth } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'

// Update media metadata (alt text, description)
export const PATCH: RequestHandler = async (event) => {
	// Check authentication
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	try {
		const { id } = event.params
		const mediaId = parseInt(id)

		if (isNaN(mediaId)) {
			return errorResponse('Invalid media ID', 400)
		}

		const body = await event.request.json()
		const { description } = body

		// Validate input
		if (typeof description !== 'string') {
			return errorResponse('Description must be provided', 400)
		}

		// Check if media exists
		const existingMedia = await prisma.media.findUnique({
			where: { id: mediaId }
		})

		if (!existingMedia) {
			return errorResponse('Media not found', 404)
		}

		// Update media metadata
		const updatedMedia = await prisma.media.update({
			where: { id: mediaId },
			data: {
				description: description.trim() || null
			}
		})

		logger.info('Media metadata updated', {
			id: mediaId,
			filename: updatedMedia.filename,
			hasDescription: !!updatedMedia.description
		})

		return jsonResponse({
			id: updatedMedia.id,
			description: updatedMedia.description,
			updatedAt: updatedMedia.updatedAt
		})
	} catch (error) {
		logger.error('Media metadata update error', error as Error)
		return errorResponse('Failed to update media metadata', 500)
	}
}

// Handle preflight requests
export const OPTIONS: RequestHandler = async () => {
	return new Response(null, {
		status: 204,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization'
		}
	})
}
