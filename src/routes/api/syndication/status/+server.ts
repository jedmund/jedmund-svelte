import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse, checkAdminAuth } from '$lib/server/api-utils'

// GET /api/syndication/status?contentType=post&contentId=123
export const GET: RequestHandler = async (event) => {
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	const contentType = event.url.searchParams.get('contentType')
	const contentId = parseInt(event.url.searchParams.get('contentId') || '')

	if (!contentType || isNaN(contentId)) {
		return errorResponse('contentType and contentId are required', 400)
	}

	const syndications = await prisma.syndication.findMany({
		where: { contentType, contentId }
	})

	return jsonResponse({ syndications })
}
