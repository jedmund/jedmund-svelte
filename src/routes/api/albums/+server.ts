import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import {
	jsonResponse,
	errorResponse,
	getPaginationParams,
	getPaginationMeta
} from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'

// GET /api/albums - List all albums
export const GET: RequestHandler = async (event) => {
	try {
		const { page, limit } = getPaginationParams(event.url)
		const skip = (page - 1) * limit

		// Get filter parameters
		const status = event.url.searchParams.get('status')

		// Build where clause
		const where: any = {}
		if (status) {
			where.status = status
		}

		// Get total count
		const total = await prisma.album.count({ where })

		// Get albums with photo count
		const albums = await prisma.album.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			skip,
			take: limit,
			include: {
				_count: {
					select: { photos: true }
				}
			}
		})

		const pagination = getPaginationMeta(total, page, limit)

		logger.info('Albums list retrieved', { total, page, limit })

		return jsonResponse({
			albums,
			pagination
		})
	} catch (error) {
		logger.error('Failed to retrieve albums', error as Error)
		return errorResponse('Failed to retrieve albums', 500)
	}
}
