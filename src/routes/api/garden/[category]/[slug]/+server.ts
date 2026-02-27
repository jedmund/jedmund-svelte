import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'
import { isValidCategory } from '$lib/constants/garden'

// GET /api/garden/[category]/[slug] - Get a single garden item (public)
export const GET: RequestHandler = async (event) => {
	const { category, slug } = event.params

	if (!isValidCategory(category)) {
		return errorResponse('Category not found', 404)
	}

	try {
		const item = await prisma.gardenItem.findUnique({
			where: {
				category_slug: { category, slug }
			}
		})

		if (!item) {
			return errorResponse('Item not found', 404)
		}

		return jsonResponse(item)
	} catch (error) {
		logger.error('Failed to retrieve garden item', error as Error)
		return errorResponse('Failed to retrieve garden item', 500)
	}
}
