import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse, checkAdminAuth } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'
import { getMediaUsage } from '$lib/server/media-usage.js'

// GET /api/media/[id]/usage - Check where media is used
export const GET: RequestHandler = async (event) => {
	// Check authentication
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	const id = parseInt(event.params.id)
	if (isNaN(id)) {
		return errorResponse('Invalid media ID', 400)
	}

	try {
		const media = await prisma.media.findUnique({
			where: { id },
			select: {
				id: true,
				filename: true,
				url: true,
				altText: true,
				description: true,
				isPhotography: true
			}
		})

		if (!media) {
			return errorResponse('Media not found', 404)
		}

		// Get detailed usage information using our new tracking system
		const usage = await getMediaUsage(id)

		return jsonResponse({
			media: {
				id: media.id,
				filename: media.filename,
				url: media.url,
				altText: media.altText,
				description: media.description,
				isPhotography: media.isPhotography
			},
			usage: usage,
			isUsed: usage.length > 0
		})
	} catch (error) {
		logger.error('Failed to check media usage', error as Error)
		return errorResponse('Failed to check media usage', 500)
	}
}
