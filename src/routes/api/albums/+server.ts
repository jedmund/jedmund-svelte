import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import {
	jsonResponse,
	errorResponse,
	getPaginationParams,
	getPaginationMeta,
	checkAdminAuth,
	parseRequestBody
} from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'

// GET /api/albums - List all albums
export const GET: RequestHandler = async (event) => {
	try {
		const { page, limit } = getPaginationParams(event.url)
		const skip = (page - 1) * limit

		// Get filter parameters
		const status = event.url.searchParams.get('status')
		const isPhotography = event.url.searchParams.get('isPhotography')

		// Build where clause
		const where: any = {}
		if (status) {
			where.status = status
		}

		if (isPhotography !== null) {
			where.isPhotography = isPhotography === 'true'
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

// POST /api/albums - Create a new album
export const POST: RequestHandler = async (event) => {
	// Check authentication
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	try {
		const body = await parseRequestBody<{
			slug: string
			title: string
			description?: string
			date?: string
			location?: string
			coverPhotoId?: number
			isPhotography?: boolean
			status?: string
			showInUniverse?: boolean
		}>(event.request)

		if (!body || !body.slug || !body.title) {
			return errorResponse('Missing required fields: slug, title', 400)
		}

		// Check if slug already exists
		const existing = await prisma.album.findUnique({
			where: { slug: body.slug }
		})

		if (existing) {
			return errorResponse('Album with this slug already exists', 409)
		}

		// Create album
		const album = await prisma.album.create({
			data: {
				slug: body.slug,
				title: body.title,
				description: body.description,
				date: body.date ? new Date(body.date) : null,
				location: body.location,
				coverPhotoId: body.coverPhotoId,
				isPhotography: body.isPhotography ?? false,
				status: body.status ?? 'draft',
				showInUniverse: body.showInUniverse ?? false
			}
		})

		logger.info('Album created', { id: album.id, slug: album.slug })

		return jsonResponse(album, 201)
	} catch (error) {
		logger.error('Failed to create album', error as Error)
		return errorResponse('Failed to create album', 500)
	}
}
