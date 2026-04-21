import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import {
	jsonResponse,
	errorResponse,
	checkAdminAuth,
	getOffsetPaginationParams,
	getOffsetPaginationMeta
} from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'
import { getAllAlbums, getPublishedAlbums, toAlbumListItem } from '$lib/server/queries/albums'

// GET /api/albums - Get published photography albums (or all albums if admin)
export const GET: RequestHandler = async (event) => {
	try {
		const { limit, offset } = getOffsetPaginationParams(event.url)
		const isAdmin = checkAdminAuth(event)

		const { albums, total } = isAdmin
			? await getAllAlbums({ limit, offset })
			: await getPublishedAlbums({ limit, offset })

		return jsonResponse({
			albums: albums.map((album) => toAlbumListItem(album, { isAdmin })),
			pagination: getOffsetPaginationMeta(total, limit, offset)
		})
	} catch (error) {
		logger.error('Failed to fetch albums', error as Error)
		return errorResponse('Failed to fetch albums', 500)
	}
}

// POST /api/albums - Create a new album (admin only)
export const POST: RequestHandler = async (event) => {
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	try {
		const body = await event.request.json()

		if (!body.title || !body.slug) {
			return errorResponse('Title and slug are required', 400)
		}

		const album = await prisma.album.create({
			data: {
				title: body.title,
				slug: body.slug,
				description: body.description || null,
				date: body.date ? new Date(body.date) : null,
				location: body.location || null,
				showInUniverse: body.showInUniverse ?? false,
				status: body.status || 'draft',
				content: body.content || null,
				publishedAt: body.status === 'published' ? new Date() : null
			}
		})

		return jsonResponse(album, 201)
	} catch (error) {
		logger.error('Failed to create album', error as Error)

		if (error instanceof Error && error.message.includes('Unique constraint')) {
			return errorResponse('An album with this slug already exists', 409)
		}

		return errorResponse('Failed to create album', 500)
	}
}
