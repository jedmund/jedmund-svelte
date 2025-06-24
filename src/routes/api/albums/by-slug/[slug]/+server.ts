import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'

// GET /api/albums/by-slug/[slug] - Get album by slug including photos
export const GET: RequestHandler = async (event) => {
	const slug = event.params.slug

	if (!slug) {
		return errorResponse('Invalid album slug', 400)
	}

	try {
		const album = await prisma.album.findUnique({
			where: { slug },
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
								description: true,
								isPhotography: true,
								mimeType: true,
								size: true,
								exifData: true
							}
						}
					}
				},
				geoLocations: {
					orderBy: { order: 'asc' }
				},
				_count: {
					select: {
						media: true
					}
				}
			}
		})

		if (!album) {
			return errorResponse('Album not found', 404)
		}

		// Transform the album data to include photos array
		const transformedAlbum = {
			...album,
			photos: album.media.map((albumMedia) => ({
				id: albumMedia.media.id,
				filename: albumMedia.media.filename,
				url: albumMedia.media.url,
				thumbnailUrl: albumMedia.media.thumbnailUrl,
				width: albumMedia.media.width,
				height: albumMedia.media.height,
				caption: albumMedia.media.photoCaption || albumMedia.media.description,
				title: albumMedia.media.photoTitle,
				description: albumMedia.media.photoDescription,
				displayOrder: albumMedia.displayOrder,
				exifData: albumMedia.media.exifData
			})),
			totalPhotos: album._count.media
		}

		return jsonResponse(transformedAlbum)
	} catch (error) {
		logger.error('Failed to retrieve album by slug', error as Error)
		return errorResponse('Failed to retrieve album', 500)
	}
}
