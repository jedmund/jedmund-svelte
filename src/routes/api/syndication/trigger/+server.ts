import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse, checkAdminAuth } from '$lib/server/api-utils'
import { syndicateContent } from '$lib/server/syndication/syndicate'
import { logger } from '$lib/server/logger'

// POST /api/syndication/trigger - Manually trigger syndication
export const POST: RequestHandler = async (event) => {
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	try {
		const { contentType, contentId } = await event.request.json()

		if (!contentType || !contentId) {
			return errorResponse('contentType and contentId are required', 400)
		}

		// Delete existing failed records so syndication can retry
		await prisma.syndication.deleteMany({
			where: {
				contentType,
				contentId: parseInt(contentId),
				status: 'failed'
			}
		})

		// Trigger syndication
		await syndicateContent(contentType, parseInt(contentId))

		// Return updated status
		const syndications = await prisma.syndication.findMany({
			where: { contentType, contentId: parseInt(contentId) }
		})

		logger.info('Manual syndication triggered', { contentType, contentId })

		return jsonResponse({ syndications })
	} catch (error) {
		logger.error('Failed to trigger syndication', error as Error)
		return errorResponse('Failed to trigger syndication', 500)
	}
}
