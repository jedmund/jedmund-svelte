import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { deleteFile, extractPublicId } from '$lib/server/cloudinary'
import {
	jsonResponse,
	errorResponse,
	checkAdminAuth,
	parseRequestBody
} from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'

// GET /api/media/[id] - Get a single media item
export const GET: RequestHandler = async (event) => {
	const id = parseInt(event.params.id)
	if (isNaN(id)) {
		return errorResponse('Invalid media ID', 400)
	}

	try {
		const media = await prisma.media.findUnique({
			where: { id }
		})

		if (!media) {
			return errorResponse('Media not found', 404)
		}

		return jsonResponse(media)
	} catch (error) {
		logger.error('Failed to retrieve media', error as Error)
		return errorResponse('Failed to retrieve media', 500)
	}
}

// PUT /api/media/[id] - Update a media item
export const PUT: RequestHandler = async (event) => {
	// Check authentication
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	const id = parseInt(event.params.id)
	if (isNaN(id)) {
		return errorResponse('Invalid media ID', 400)
	}

	try {
		const body = await parseRequestBody<{
			description?: string
			isPhotography?: boolean
		}>(event.request)

		if (!body) {
			return errorResponse('Invalid request body', 400)
		}

		// Check if media exists
		const existing = await prisma.media.findUnique({
			where: { id }
		})

		if (!existing) {
			return errorResponse('Media not found', 404)
		}

		// Update media
		const media = await prisma.media.update({
			where: { id },
			data: {
				description: body.description !== undefined ? body.description : existing.description,
				isPhotography:
					body.isPhotography !== undefined ? body.isPhotography : existing.isPhotography
			}
		})

		// If isPhotography changed to true, set photoPublishedAt
		if (body.isPhotography === true && !existing.isPhotography) {
			await prisma.media.update({
				where: { id },
				data: {
					photoPublishedAt: new Date(),
					photoCaption: existing.description // Use description as initial caption
				}
			})
		} else if (body.isPhotography === false && existing.isPhotography) {
			// If turning off photography, clear photo fields
			await prisma.media.update({
				where: { id },
				data: {
					photoPublishedAt: null,
					photoCaption: null,
					photoTitle: null,
					photoDescription: null,
					photoSlug: null
				}
			})
		}

		logger.info('Media updated', { id, filename: media.filename })

		return jsonResponse(media)
	} catch (error) {
		logger.error('Failed to update media', error as Error)
		return errorResponse('Failed to update media', 500)
	}
}

// DELETE /api/media/[id] - Delete a media item
export const DELETE: RequestHandler = async (event) => {
	// Check authentication
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	const id = parseInt(event.params.id)
	if (isNaN(id)) {
		return errorResponse('Invalid media ID', 400)
	}

	try {
		// Get the media item
		const media = await prisma.media.findUnique({
			where: { id }
		})

		if (!media) {
			return errorResponse('Media not found', 404)
		}

		// Check if media is in use
		if (media.usedIn && Array.isArray(media.usedIn) && media.usedIn.length > 0) {
			return errorResponse('Cannot delete media that is in use', 409)
		}

		// Delete from Cloudinary
		const publicId = extractPublicId(media.url)
		if (publicId) {
			const deleted = await deleteFile(publicId)
			if (!deleted) {
				logger.warn('Failed to delete from Cloudinary', { publicId, mediaId: id })
			}
		}

		// Delete from database
		await prisma.media.delete({
			where: { id }
		})

		logger.info('Media deleted', { id, filename: media.filename })

		return new Response(null, { status: 204 })
	} catch (error) {
		logger.error('Failed to delete media', error as Error)
		return errorResponse('Failed to delete media', 500)
	}
}
