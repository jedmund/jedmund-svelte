import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import {
	jsonResponse,
	errorResponse,
	checkAdminAuth,
	parseRequestBody
} from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'

// GET /api/albums/[id] - Get a single album
export const GET: RequestHandler = async (event) => {
	const id = parseInt(event.params.id)
	if (isNaN(id)) {
		return errorResponse('Invalid album ID', 400)
	}

	try {
		const album = await prisma.album.findUnique({
			where: { id },
			include: {
				photos: {
					orderBy: { displayOrder: 'asc' }
				},
				_count: {
					select: { photos: true }
				}
			}
		})

		if (!album) {
			return errorResponse('Album not found', 404)
		}

		// Get all media usage records for this album's photos in one query
		const mediaUsages = await prisma.mediaUsage.findMany({
			where: {
				contentType: 'album',
				contentId: album.id,
				fieldName: 'photos'
			},
			include: {
				media: true
			}
		})

		// Create a map of media by mediaId for efficient lookup
		const mediaMap = new Map()
		mediaUsages.forEach((usage) => {
			if (usage.media) {
				mediaMap.set(usage.mediaId, usage.media)
			}
		})

		// Enrich photos with media information using proper media usage tracking
		const photosWithMedia = album.photos.map((photo) => {
			// Find the corresponding media usage record for this photo
			const usage = mediaUsages.find((u) => u.media && u.media.filename === photo.filename)
			const media = usage?.media

			return {
				...photo,
				mediaId: media?.id || null,
				altText: media?.altText || '',
				description: media?.description || photo.caption || '',
				isPhotography: media?.isPhotography || false,
				mimeType: media?.mimeType || 'image/jpeg',
				size: media?.size || 0
			}
		})

		const albumWithEnrichedPhotos = {
			...album,
			photos: photosWithMedia
		}

		return jsonResponse(albumWithEnrichedPhotos)
	} catch (error) {
		logger.error('Failed to retrieve album', error as Error)
		return errorResponse('Failed to retrieve album', 500)
	}
}

// PUT /api/albums/[id] - Update an album
export const PUT: RequestHandler = async (event) => {
	// Check authentication
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	const id = parseInt(event.params.id)
	if (isNaN(id)) {
		return errorResponse('Invalid album ID', 400)
	}

	try {
		const body = await parseRequestBody<{
			slug?: string
			title?: string
			description?: string
			date?: string
			location?: string
			coverPhotoId?: number
			isPhotography?: boolean
			status?: string
			showInUniverse?: boolean
		}>(event.request)

		if (!body) {
			return errorResponse('Invalid request body', 400)
		}

		// Check if album exists
		const existing = await prisma.album.findUnique({
			where: { id }
		})

		if (!existing) {
			return errorResponse('Album not found', 404)
		}

		// If slug is being updated, check for conflicts
		if (body.slug && body.slug !== existing.slug) {
			const slugExists = await prisma.album.findUnique({
				where: { slug: body.slug }
			})

			if (slugExists) {
				return errorResponse('Album with this slug already exists', 409)
			}
		}

		// Update album
		const album = await prisma.album.update({
			where: { id },
			data: {
				slug: body.slug ?? existing.slug,
				title: body.title ?? existing.title,
				description: body.description !== undefined ? body.description : existing.description,
				date: body.date !== undefined ? (body.date ? new Date(body.date) : null) : existing.date,
				location: body.location !== undefined ? body.location : existing.location,
				coverPhotoId: body.coverPhotoId !== undefined ? body.coverPhotoId : existing.coverPhotoId,
				isPhotography: body.isPhotography ?? existing.isPhotography,
				status: body.status ?? existing.status,
				showInUniverse: body.showInUniverse ?? existing.showInUniverse
			}
		})

		logger.info('Album updated', { id, slug: album.slug })

		return jsonResponse(album)
	} catch (error) {
		logger.error('Failed to update album', error as Error)
		return errorResponse('Failed to update album', 500)
	}
}

// DELETE /api/albums/[id] - Delete an album
export const DELETE: RequestHandler = async (event) => {
	// Check authentication
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	const id = parseInt(event.params.id)
	if (isNaN(id)) {
		return errorResponse('Invalid album ID', 400)
	}

	try {
		// Check if album exists
		const album = await prisma.album.findUnique({
			where: { id },
			include: {
				_count: {
					select: { photos: true }
				}
			}
		})

		if (!album) {
			return errorResponse('Album not found', 404)
		}

		// Check if album has photos
		if (album._count.photos > 0) {
			return errorResponse('Cannot delete album that contains photos', 409)
		}

		// Delete album
		await prisma.album.delete({
			where: { id }
		})

		logger.info('Album deleted', { id, slug: album.slug })

		return new Response(null, { status: 204 })
	} catch (error) {
		logger.error('Failed to delete album', error as Error)
		return errorResponse('Failed to delete album', 500)
	}
}
