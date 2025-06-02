import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'

// GET /api/photos/[albumSlug]/[photoId] - Get individual photo with album context
export const GET: RequestHandler = async (event) => {
	const albumSlug = event.params.albumSlug
	const photoId = parseInt(event.params.photoId)

	if (!albumSlug || isNaN(photoId)) {
		return errorResponse('Invalid album slug or photo ID', 400)
	}

	try {
		// First find the album
		const album = await prisma.album.findUnique({
			where: {
				slug: albumSlug,
				status: 'published',
				isPhotography: true
			},
			include: {
				photos: {
					orderBy: { displayOrder: 'asc' },
					select: {
						id: true,
						filename: true,
						url: true,
						thumbnailUrl: true,
						width: true,
						height: true,
						caption: true,
						title: true,
						description: true,
						displayOrder: true,
						exifData: true
					}
				}
			}
		})

		if (!album) {
			return errorResponse('Album not found', 404)
		}

		// Find the specific photo
		const photo = album.photos.find((p) => p.id === photoId)
		if (!photo) {
			return errorResponse('Photo not found in album', 404)
		}

		// Get photo index for navigation
		const photoIndex = album.photos.findIndex((p) => p.id === photoId)
		const prevPhoto = photoIndex > 0 ? album.photos[photoIndex - 1] : null
		const nextPhoto = photoIndex < album.photos.length - 1 ? album.photos[photoIndex + 1] : null

		return jsonResponse({
			photo,
			album: {
				id: album.id,
				slug: album.slug,
				title: album.title,
				description: album.description,
				location: album.location,
				date: album.date,
				totalPhotos: album.photos.length
			},
			navigation: {
				currentIndex: photoIndex + 1, // 1-based for display
				totalCount: album.photos.length,
				prevPhoto: prevPhoto ? { id: prevPhoto.id, url: prevPhoto.thumbnailUrl } : null,
				nextPhoto: nextPhoto ? { id: nextPhoto.id, url: nextPhoto.thumbnailUrl } : null
			}
		})
	} catch (error) {
		logger.error('Failed to retrieve photo', error as Error)
		return errorResponse('Failed to retrieve photo', 500)
	}
}
