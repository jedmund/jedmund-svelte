import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import {
	jsonResponse,
	errorResponse,
	getPaginationParams,
	getPaginationMeta,
	checkAdminAuth
} from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'

// GET /api/media - List all media with pagination and filters
export const GET: RequestHandler = async (event) => {
	// Check authentication
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	try {
		const { page, limit } = getPaginationParams(event.url)
		const skip = (page - 1) * limit

		// Get filter parameters
		const mimeType = event.url.searchParams.get('mimeType')
		const unused = event.url.searchParams.get('unused') === 'true'
		const search = event.url.searchParams.get('search')
		const isPhotography = event.url.searchParams.get('isPhotography')

		// Build where clause
		const where: any = {}

		if (mimeType) {
			where.mimeType = { startsWith: mimeType }
		}

		if (unused) {
			where.usedIn = { equals: [] }
		}

		if (search) {
			where.filename = { contains: search, mode: 'insensitive' }
		}

		if (isPhotography !== null) {
			where.isPhotography = isPhotography === 'true'
		}

		// Get total count
		const total = await prisma.media.count({ where })

		// Get media items
		const media = await prisma.media.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			skip,
			take: limit,
			select: {
				id: true,
				filename: true,
				mimeType: true,
				size: true,
				url: true,
				thumbnailUrl: true,
				width: true,
				height: true,
				usedIn: true,
				isPhotography: true,
				createdAt: true,
				description: true,
				exifData: true
			}
		})

		const pagination = getPaginationMeta(total, page, limit)

		logger.info('Media list retrieved', { total, page, limit })

		return jsonResponse({
			media,
			pagination
		})
	} catch (error) {
		logger.error('Failed to retrieve media', error as Error)
		return errorResponse('Failed to retrieve media', 500)
	}
}
