import type { RequestHandler } from './$types'
import {
	jsonResponse,
	errorResponse,
	getOffsetPaginationParams,
	getOffsetPaginationMeta
} from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'
import { getPaginatedPhotos } from '$lib/server/queries/photos'

// GET /api/photos - Get individual photos only (albums excluded from collection)
export const GET: RequestHandler = async (event) => {
	try {
		const { limit, offset } = getOffsetPaginationParams(event.url)
		const { photos, total } = await getPaginatedPhotos({ limit, offset })

		return jsonResponse({
			photoItems: photos,
			pagination: getOffsetPaginationMeta(total, limit, offset)
		})
	} catch (error) {
		logger.error('Failed to fetch photos', error as Error)
		return errorResponse('Failed to fetch photos', 500)
	}
}
