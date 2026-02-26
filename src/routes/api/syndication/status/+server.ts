import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse, checkAdminAuth } from '$lib/server/api-utils'

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

// POST /api/syndication/status - Create a manual syndication record
export const POST: RequestHandler = async (event) => {
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	try {
		const { contentType, contentId, platform, externalUrl } = await event.request.json()

		if (!contentType || !contentId || !platform || !externalUrl) {
			return errorResponse('contentType, contentId, platform, and externalUrl are required', 400)
		}

		if (!['bluesky', 'mastodon'].includes(platform)) {
			return errorResponse('platform must be "bluesky" or "mastodon"', 400)
		}

		const record = await prisma.syndication.upsert({
			where: {
				contentType_contentId_platform: { contentType, contentId, platform }
			},
			create: {
				contentType,
				contentId,
				platform,
				externalUrl,
				status: 'manual'
			},
			update: {
				externalUrl,
				status: 'manual',
				errorMessage: null
			}
		})

		return jsonResponse(record, 201)
	} catch {
		return errorResponse('Failed to create syndication record', 500)
	}
}
