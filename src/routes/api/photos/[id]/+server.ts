import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse, checkAdminAuth } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'

// GET /api/photos/[id] - Get a single media item as photo
export const GET: RequestHandler = async (event) => {
	const id = parseInt(event.params.id)
	if (isNaN(id)) {
		return errorResponse('Invalid media ID', 400)
	}

	try {
		const media = await prisma.media.findUnique({
			where: { id },
			include: {
				albums: {
					include: {
						album: {
							select: { id: true, title: true, slug: true }
						}
					}
				}
			}
		})

		if (!media) {
			return errorResponse('Photo not found', 404)
		}

		// For public access, only return media marked as photography
		const isAdminRequest = checkAdminAuth(event)
		if (!isAdminRequest) {
			if (!media.isPhotography) {
				return errorResponse('Photo not found', 404)
			}
			// If media is in an album, check album is published and isPhotography
			if (media.albums.length > 0) {
				const album = media.albums[0].album
				const fullAlbum = await prisma.album.findUnique({
					where: { id: album.id }
				})
				if (!fullAlbum || fullAlbum.status !== 'published' || !fullAlbum.isPhotography) {
					return errorResponse('Photo not found', 404)
				}
			}
		}

		// Transform to match expected photo format
		const photo = {
			id: media.id,
			filename: media.filename,
			url: media.url,
			thumbnailUrl: media.thumbnailUrl,
			width: media.width,
			height: media.height,
			exifData: media.exifData,
			caption: media.photoCaption,
			title: media.photoTitle,
			description: media.photoDescription,
			slug: media.photoSlug,
			publishedAt: media.photoPublishedAt,
			createdAt: media.createdAt,
			album: media.albums.length > 0 ? media.albums[0].album : null,
			media: media // Include full media object for compatibility
		}

		return jsonResponse(photo)
	} catch (error) {
		logger.error('Failed to retrieve photo', error as Error)
		return errorResponse('Failed to retrieve photo', 500)
	}
}

// DELETE /api/photos/[id] - Remove media from photography display
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
		// Check if media exists
		const media = await prisma.media.findUnique({
			where: { id }
		})

		if (!media) {
			return errorResponse('Photo not found', 404)
		}

		// Update media to remove from photography
		await prisma.media.update({
			where: { id },
			data: {
				isPhotography: false,
				photoCaption: null,
				photoTitle: null,
				photoDescription: null,
				photoSlug: null,
				photoPublishedAt: null
			}
		})

		// Remove from all albums
		await prisma.albumMedia.deleteMany({
			where: { mediaId: id }
		})

		logger.info('Media removed from photography', { mediaId: id })

		return new Response(null, { status: 204 })
	} catch (error) {
		logger.error('Failed to remove photo', error as Error)
		return errorResponse('Failed to remove photo', 500)
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
		return errorResponse('Invalid media ID', 400)
	}

	try {
		const body = await event.request.json()

		// Check if media exists
		const existing = await prisma.media.findUnique({
			where: { id }
		})

		if (!existing) {
			return errorResponse('Photo not found', 404)
		}

		// Update media photo fields
		const media = await prisma.media.update({
			where: { id },
			data: {
				photoCaption: body.caption !== undefined ? body.caption : existing.photoCaption,
				photoTitle: body.title !== undefined ? body.title : existing.photoTitle,
				photoDescription: body.description !== undefined ? body.description : existing.photoDescription,
				isPhotography: body.showInPhotos !== undefined ? body.showInPhotos : existing.isPhotography,
				photoPublishedAt: body.publishedAt !== undefined ? body.publishedAt : existing.photoPublishedAt
			}
		})

		logger.info('Photo metadata updated', { mediaId: id })

		// Return in photo format for compatibility
		const photo = {
			id: media.id,
			caption: media.photoCaption,
			title: media.photoTitle,
			description: media.photoDescription,
			showInPhotos: media.isPhotography,
			publishedAt: media.photoPublishedAt
		}

		return jsonResponse(photo)
	} catch (error) {
		logger.error('Failed to update photo', error as Error)
		return errorResponse('Failed to update photo', 500)
	}
}
