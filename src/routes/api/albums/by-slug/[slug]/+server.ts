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
				photos: {
					where: {
						status: 'published',
						showInPhotos: true
					},
					orderBy: { displayOrder: 'asc' },
					select: {
						id: true,
						filename: true,
						url: true,
						thumbnailUrl: true,
						width: true,
						height: true,
						caption: true,
						displayOrder: true
					}
				},
				_count: {
					select: {
						photos: {
							where: {
								status: 'published',
								showInPhotos: true
							}
						}
					}
				}
			}
		})

		if (!album) {
			return errorResponse('Album not found', 404)
		}

		return jsonResponse(album)
	} catch (error) {
		logger.error('Failed to retrieve album by slug', error as Error)
		return errorResponse('Failed to retrieve album', 500)
	}
}
