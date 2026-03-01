import type { RequestHandler } from './$types'
import type { Prisma } from '@prisma/client'
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

	const sort = event.url.searchParams.get('sort') || 'display-order'
	const bangers = event.url.searchParams.get('bangers') === 'true'

	const where: Prisma.GardenItemWhereInput = { category, status: 'published' }
	if (bangers) {
		where.isFavorite = true
	}

	let orderBy: Prisma.GardenItemOrderByWithRelationInput[]
	switch (sort) {
		case 'a-to-z':
			orderBy = [{ title: 'asc' }]
			break
		case 'z-to-a':
			orderBy = [{ title: 'desc' }]
			break
		case 'recently-added':
			orderBy = [{ publishedAt: 'desc' }, { createdAt: 'desc' }]
			break
		case 'oldest-added':
			orderBy = [{ publishedAt: 'asc' }, { createdAt: 'asc' }]
			break
		case 'recently-released':
			orderBy = [{ date: 'desc' }]
			break
		case 'oldest-released':
			orderBy = [{ date: 'asc' }]
			break
		case 'display-order':
		default:
			orderBy = [{ displayOrder: 'asc' }, { createdAt: 'desc' }]
			break
	}

	try {
		const items = await prisma.gardenItem.findMany({ where, orderBy })

		return jsonResponse({ items, category })
	} catch (error) {
		logger.error('Failed to retrieve garden items by category', error as Error)
		return errorResponse('Failed to retrieve garden items', 500)
	}
}
