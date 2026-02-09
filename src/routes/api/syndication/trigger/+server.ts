import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse, checkAdminAuth } from '$lib/server/api-utils'
import { syndicateContent } from '$lib/server/syndication/syndicate'
import { logger } from '$lib/server/logger'

export const POST: RequestHandler = async (event) => {
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	try {
		const body = await event.request.json()

		if (!body.contentType || !body.contentId) {
			return errorResponse('contentType and contentId are required', 400)
		}

		const contentType = body.contentType
		const contentId = parseInt(body.contentId)
		if (isNaN(contentId)) {
			return errorResponse('contentId must be a number', 400)
		}

		await prisma.syndication.deleteMany({
			where: {
				contentType,
				contentId,
				status: 'failed'
			}
		})

		await syndicateContent(contentType, contentId)

		const syndications = await prisma.syndication.findMany({
			where: { contentType, contentId }
		})

		logger.info('Manual syndication triggered', { contentType, contentId: contentId.toString() })

		return jsonResponse({ syndications })
	} catch (error) {
		logger.error('Failed to trigger syndication', error as Error)
		return errorResponse('Failed to trigger syndication', 500)
	}
}
