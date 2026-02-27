import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'
import { isValidCategory } from '$lib/constants/garden'

// GET /api/garden/[category] - List items by category (public)
export const GET: RequestHandler = async (event) => {
	const { category } = event.params

	if (!isValidCategory(category)) {
		return errorResponse('Category not found', 404)
	}

	try {
		const items = await prisma.gardenItem.findMany({
			where: { category, status: 'published' },
			orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }]
		})

		return jsonResponse({ items, category })
	} catch (error) {
		logger.error('Failed to retrieve garden items by category', error as Error)
		return errorResponse('Failed to retrieve garden items', 500)
	}
}
