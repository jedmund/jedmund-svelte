import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'

// GET /api/test-photos - Test endpoint to debug photo visibility
export const GET: RequestHandler = async () => {
	try {
		// Query 1: Get all photos with showInPhotos=true and albumId=null
		const photosWithShowInPhotos = await prisma.photo.findMany({
			where: {
				showInPhotos: true,
				albumId: null
			},
			select: {
				id: true,
				slug: true,
				filename: true,
				url: true,
				status: true,
				showInPhotos: true,
				albumId: true,
				publishedAt: true,
				createdAt: true,
				title: true,
				description: true,
				caption: true
			},
			orderBy: { createdAt: 'desc' }
		})

		// Query 2: Get count of photos by status with showInPhotos=true and albumId=null
		const photosByStatus = await prisma.photo.groupBy({
			by: ['status'],
			where: {
				showInPhotos: true,
				albumId: null
			},
			_count: {
				id: true
			}
		})

		// Query 3: Get all photos regardless of status to see what exists
		const allPhotosNoAlbum = await prisma.photo.findMany({
			where: {
				albumId: null
			},
			select: {
				id: true,
				slug: true,
				filename: true,
				status: true,
				showInPhotos: true,
				albumId: true,
				publishedAt: true,
				createdAt: true
			},
			orderBy: { createdAt: 'desc' }
		})

		// Query 3b: Get ALL photos to see what's in the database
		const allPhotos = await prisma.photo.findMany({
			select: {
				id: true,
				slug: true,
				filename: true,
				status: true,
				showInPhotos: true,
				albumId: true,
				publishedAt: true,
				createdAt: true,
				album: {
					select: {
						title: true
					}
				}
			},
			orderBy: { createdAt: 'desc' }
		})

		// Query 4: Get specific published photos that should appear
		const publishedPhotos = await prisma.photo.findMany({
			where: {
				status: 'published',
				showInPhotos: true,
				albumId: null
			},
			select: {
				id: true,
				slug: true,
				filename: true,
				url: true,
				status: true,
				showInPhotos: true,
				albumId: true,
				publishedAt: true,
				createdAt: true,
				title: true
			}
		})

		// Query 5: Raw SQL query to double-check
		const rawQuery = await prisma.$queryRaw`
			SELECT id, slug, filename, status, "showInPhotos", "albumId", "publishedAt", "createdAt"
			FROM "Photo"
			WHERE "showInPhotos" = true AND "albumId" IS NULL
			ORDER BY "createdAt" DESC
		`

		// Query 6: Get all albums and their isPhotography flag
		const allAlbums = await prisma.album.findMany({
			select: {
				id: true,
				title: true,
				slug: true,
				isPhotography: true,
				status: true,
				createdAt: true,
				_count: {
					select: {
						photos: true
					}
				}
			},
			orderBy: { id: 'asc' }
		})

		// Query 7: Get photos from albums with isPhotography=true
		const photosFromPhotographyAlbums = await prisma.photo.findMany({
			where: {
				album: {
					isPhotography: true
				}
			},
			select: {
				id: true,
				slug: true,
				filename: true,
				status: true,
				showInPhotos: true,
				albumId: true,
				album: {
					select: {
						id: true,
						title: true,
						isPhotography: true
					}
				}
			}
		})

		// Query 8: Specifically check album with ID 5
		const albumFive = await prisma.album.findUnique({
			where: { id: 5 },
			include: {
				photos: {
					select: {
						id: true,
						slug: true,
						filename: true,
						status: true,
						showInPhotos: true
					}
				}
			}
		})

		const response = {
			summary: {
				totalPhotosWithShowInPhotos: photosWithShowInPhotos.length,
				totalPublishedPhotos: publishedPhotos.length,
				totalPhotosNoAlbum: allPhotosNoAlbum.length,
				totalPhotosInDatabase: allPhotos.length,
				photosByStatus: photosByStatus.map((item) => ({
					status: item.status,
					count: item._count.id
				})),
				photosWithShowInPhotosFlag: allPhotos.filter((p) => p.showInPhotos).length,
				photosByFilename: allPhotos
					.filter((p) => p.filename?.includes('B0000057'))
					.map((p) => ({
						filename: p.filename,
						showInPhotos: p.showInPhotos,
						status: p.status,
						albumId: p.albumId,
						albumTitle: p.album?.title
					}))
			},
			albums: {
				totalAlbums: allAlbums.length,
				photographyAlbums: allAlbums
					.filter((a) => a.isPhotography)
					.map((a) => ({
						id: a.id,
						title: a.title,
						slug: a.slug,
						isPhotography: a.isPhotography,
						status: a.status,
						photoCount: a._count.photos
					})),
				nonPhotographyAlbums: allAlbums
					.filter((a) => !a.isPhotography)
					.map((a) => ({
						id: a.id,
						title: a.title,
						slug: a.slug,
						isPhotography: a.isPhotography,
						status: a.status,
						photoCount: a._count.photos
					})),
				albumFive: albumFive
					? {
							id: albumFive.id,
							title: albumFive.title,
							slug: albumFive.slug,
							isPhotography: albumFive.isPhotography,
							status: albumFive.status,
							publishedAt: albumFive.publishedAt,
							photoCount: albumFive.photos.length,
							photos: albumFive.photos
						}
					: null,
				photosFromPhotographyAlbums: photosFromPhotographyAlbums.length,
				photosFromPhotographyAlbumsSample: photosFromPhotographyAlbums.slice(0, 5)
			},
			queries: {
				photosWithShowInPhotos: photosWithShowInPhotos,
				publishedPhotos: publishedPhotos,
				allPhotosNoAlbum: allPhotosNoAlbum,
				allPhotos: allPhotos,
				rawQueryResults: rawQuery,
				allAlbums: allAlbums
			},
			debug: {
				expectedQuery: 'WHERE status = "published" AND showInPhotos = true AND albumId = null',
				actualPhotosEndpointQuery: '/api/photos uses this exact query',
				albumsWithPhotographyFlagTrue: allAlbums
					.filter((a) => a.isPhotography)
					.map((a) => `${a.id}: ${a.title}`)
			}
		}

		logger.info('Test photos query results', response.summary)

		return jsonResponse(response)
	} catch (error) {
		logger.error('Failed to run test photos query', error as Error)
		return errorResponse(
			`Failed to run test query: ${error instanceof Error ? error.message : 'Unknown error'}`,
			500
		)
	}
}
