import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'

// GET /api/photos/[albumSlug]/[photoId] - Get individual photo with album context
export const GET: RequestHandler = async (event) => {
	const albumSlug = event.params.albumSlug
	const mediaId = parseInt(event.params.photoId) // Still called photoId in URL for compatibility

	if (!albumSlug || isNaN(mediaId)) {
		return errorResponse('Invalid album slug or media ID', 400)
	}

	try {
		// First find the album with its media
		const album = await prisma.album.findUnique({
			where: {
				slug: albumSlug,
				status: 'published',
				isPhotography: true
			},
			include: {
				media: {
					orderBy: { displayOrder: 'asc' },
					include: {
						media: {
							select: {
								id: true,
								filename: true,
								url: true,
								thumbnailUrl: true,
								width: true,
								height: true,
								photoCaption: true,
								photoTitle: true,
								photoDescription: true,
								exifData: true,
								createdAt: true,
								photoPublishedAt: true
							}
						}
					}
				}
			}
		})

		if (!album) {
			return errorResponse('Album not found', 404)
		}

		// Find the specific media
		const albumMediaIndex = album.media.findIndex((am) => am.media.id === mediaId)
		if (albumMediaIndex === -1) {
			return errorResponse('Photo not found in album', 404)
		}

		const albumMedia = album.media[albumMediaIndex]
		const media = albumMedia.media

		// Get navigation info
		const prevMedia = albumMediaIndex > 0 ? album.media[albumMediaIndex - 1].media : null
		const nextMedia =
			albumMediaIndex < album.media.length - 1 ? album.media[albumMediaIndex + 1].media : null

		// Transform to photo format for compatibility
		const photo = {
			id: media.id,
			filename: media.filename,
			url: media.url,
			thumbnailUrl: media.thumbnailUrl,
			width: media.width,
			height: media.height,
			caption: media.photoCaption,
			title: media.photoTitle,
			description: media.photoDescription,
			displayOrder: albumMedia.displayOrder,
			exifData: media.exifData,
			createdAt: media.createdAt,
			publishedAt: media.photoPublishedAt
		}

		return jsonResponse({
			photo,
			album: {
				id: album.id,
				slug: album.slug,
				title: album.title,
				description: album.description,
				location: album.location,
				date: album.date,
				totalPhotos: album.media.length
			},
			navigation: {
				currentIndex: albumMediaIndex + 1, // 1-based for display
				totalCount: album.media.length,
				prevPhoto: prevMedia ? { id: prevMedia.id, url: prevMedia.thumbnailUrl } : null,
				nextPhoto: nextMedia ? { id: nextMedia.id, url: nextMedia.thumbnailUrl } : null
			}
		})
	} catch (error) {
		logger.error('Failed to retrieve photo', error as Error)
		return errorResponse('Failed to retrieve photo', 500)
	}
}
