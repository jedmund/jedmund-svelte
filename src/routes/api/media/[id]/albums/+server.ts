import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { checkAdminAuth, errorResponse, jsonResponse } from '$lib/server/api-utils'

export const GET: RequestHandler = async (event) => {
	try {
		const mediaId = parseInt(event.params.id)

		// Check if this is an admin request
		const isAdmin = checkAdminAuth(event)

		// Get all albums associated with this media item
		const albumMedia = await prisma.albumMedia.findMany({
			where: {
				mediaId: mediaId
			},
			include: {
				album: {
					select: {
						id: true,
						slug: true,
						title: true,
						description: true,
						date: true,
						location: true,
						status: true,
						showInUniverse: true,
						coverPhotoId: true,
						publishedAt: true
					}
				}
			},
			orderBy: {
				album: {
					date: 'desc'
				}
			}
		})

		// Extract just the album data
		let albums = albumMedia.map((am) => am.album)

		// Only filter by status if not admin
		if (!isAdmin) {
			albums = albums.filter((album) => album.status === 'published')
		}

		return jsonResponse({ albums })
	} catch (error) {
		console.error('Error fetching albums for media:', error)
		return errorResponse('Failed to fetch albums', 500)
	}
}

export const PUT: RequestHandler = async (event) => {
	// Check authentication
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	try {
		const mediaId = parseInt(event.params.id)
		const { albumIds } = await event.request.json()

		if (!Array.isArray(albumIds)) {
			return errorResponse('albumIds must be an array', 400)
		}

		// Start a transaction to update album associations
		await prisma.$transaction(async (tx) => {
			// First, remove all existing album associations
			await tx.albumMedia.deleteMany({
				where: {
					mediaId: mediaId
				}
			})

			// Then, create new associations
			if (albumIds.length > 0) {
				// Get the max display order for each album
				const albumOrders = await Promise.all(
					albumIds.map(async (albumId) => {
						const maxOrder = await tx.albumMedia.aggregate({
							where: { albumId: albumId },
							_max: { displayOrder: true }
						})
						return {
							albumId: albumId,
							displayOrder: (maxOrder._max.displayOrder || 0) + 1
						}
					})
				)

				// Create new associations
				await tx.albumMedia.createMany({
					data: albumOrders.map(({ albumId, displayOrder }) => ({
						albumId: albumId,
						mediaId: mediaId,
						displayOrder: displayOrder
					}))
				})
			}
		})

		// Fetch the updated albums
		const updatedAlbumMedia = await prisma.albumMedia.findMany({
			where: {
				mediaId: mediaId
			},
			include: {
				album: true
			}
		})

		const albums = updatedAlbumMedia.map((am) => am.album)

		return jsonResponse({
			success: true,
			albums: albums
		})
	} catch (error) {
		console.error('Error updating media albums:', error)
		return errorResponse('Failed to update albums', 500)
	}
}
