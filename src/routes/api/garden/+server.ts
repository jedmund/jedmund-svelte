import type { RequestHandler } from './$types'
import { jsonResponse, errorResponse } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'
import { getPublishedGardenItems } from '$lib/server/queries/garden'

// GET /api/garden - List all garden items (public)
export const GET: RequestHandler = async (event) => {
	try {
		const items = await getPublishedGardenItems({
			category: event.url.searchParams.get('category') ?? undefined,
			current: event.url.searchParams.get('current') === 'true',
			favorites: event.url.searchParams.get('favorites') === 'true'
		})

		return jsonResponse({ items })
	} catch (error) {
		logger.error('Failed to retrieve garden items', error as Error)
		return errorResponse('Failed to retrieve garden items', 500)
	}
}
