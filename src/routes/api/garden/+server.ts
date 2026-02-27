import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'

// GET /api/garden - List all garden items (public)
export const GET: RequestHandler = async (event) => {
	try {
		const category = event.url.searchParams.get('category')
		const current = event.url.searchParams.get('current')
		const favorites = event.url.searchParams.get('favorites')

		const where: Record<string, unknown> = {}

		if (category) {
			where.category = category
		}
		if (current === 'true') {
			where.isCurrent = true
		}
		if (favorites === 'true') {
			where.isFavorite = true
		}

		const items = await prisma.gardenItem.findMany({
			where,
			orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }]
		})

		return jsonResponse({ items })
	} catch (error) {
		logger.error('Failed to retrieve garden items', error as Error)
		return errorResponse('Failed to retrieve garden items', 500)
	}
}
