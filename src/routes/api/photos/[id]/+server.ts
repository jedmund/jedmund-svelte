import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse, checkAdminAuth } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'

// GET /api/photos/[id] - Get a single photo
export const GET: RequestHandler = async (event) => {
	const id = parseInt(event.params.id)
	if (isNaN(id)) {
		return errorResponse('Invalid photo ID', 400)
	}

	try {
		const photo = await prisma.photo.findUnique({
			where: { id },
			include: {
				album: {
					select: { id: true, title: true, slug: true }
				}
			}
		})

		if (!photo) {
			return errorResponse('Photo not found', 404)
		}

		return jsonResponse(photo)
	} catch (error) {
		logger.error('Failed to retrieve photo', error as Error)
		return errorResponse('Failed to retrieve photo', 500)
	}
}

// DELETE /api/photos/[id] - Delete a photo (remove from album)
export const DELETE: RequestHandler = async (event) => {
	// Check authentication
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	const id = parseInt(event.params.id)
	if (isNaN(id)) {
		return errorResponse('Invalid photo ID', 400)
	}

	try {
		// Check if photo exists
		const photo = await prisma.photo.findUnique({
			where: { id }
		})

		if (!photo) {
			return errorResponse('Photo not found', 404)
		}

		// Remove media usage tracking for this photo
		if (photo.albumId) {
			await prisma.mediaUsage.deleteMany({
				where: {
					contentType: 'album',
					contentId: photo.albumId,
					fieldName: 'photos'
				}
			})
		}

		// Delete the photo record
		await prisma.photo.delete({
			where: { id }
		})

		logger.info('Photo deleted from album', { 
			photoId: id, 
			albumId: photo.albumId 
		})

		return new Response(null, { status: 204 })
	} catch (error) {
		logger.error('Failed to delete photo', error as Error)
		return errorResponse('Failed to delete photo', 500)
	}
}

// PUT /api/photos/[id] - Update photo metadata
export const PUT: RequestHandler = async (event) => {
	// Check authentication
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	const id = parseInt(event.params.id)
	if (isNaN(id)) {
		return errorResponse('Invalid photo ID', 400)
	}

	try {
		const body = await event.request.json()

		// Check if photo exists
		const existing = await prisma.photo.findUnique({
			where: { id }
		})

		if (!existing) {
			return errorResponse('Photo not found', 404)
		}

		// Update photo
		const photo = await prisma.photo.update({
			where: { id },
			data: {
				caption: body.caption !== undefined ? body.caption : existing.caption,
				title: body.title !== undefined ? body.title : existing.title,
				description: body.description !== undefined ? body.description : existing.description,
				displayOrder: body.displayOrder !== undefined ? body.displayOrder : existing.displayOrder,
				status: body.status !== undefined ? body.status : existing.status,
				showInPhotos: body.showInPhotos !== undefined ? body.showInPhotos : existing.showInPhotos
			}
		})

		logger.info('Photo updated', { photoId: id })

		return jsonResponse(photo)
	} catch (error) {
		logger.error('Failed to update photo', error as Error)
		return errorResponse('Failed to update photo', 500)
	}
}