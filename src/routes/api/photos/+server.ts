import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'
import type { PhotoItem, PhotoAlbum, Photo } from '$lib/types/photos'

// GET /api/photos - Get published photography albums and individual photos
export const GET: RequestHandler = async (event) => {
	try {
		const url = new URL(event.request.url)
		const limit = parseInt(url.searchParams.get('limit') || '50')
		const offset = parseInt(url.searchParams.get('offset') || '0')

		// Fetch published photography albums
		const albums = await prisma.album.findMany({
			where: { 
				status: 'published',
				isPhotography: true
			},
			include: {
				photos: {
					where: { 
						status: 'published'
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
				}
			},
			orderBy: { createdAt: 'desc' },
			skip: offset,
			take: limit
		})

		// Fetch individual published photos (not in albums, marked for photography)
		const individualPhotos = await prisma.photo.findMany({
			where: {
				status: 'published',
				showInPhotos: true,
				albumId: null // Only photos not in albums
			},
			select: {
				id: true,
				slug: true,
				filename: true,
				url: true,
				thumbnailUrl: true,
				width: true,
				height: true,
				caption: true,
				title: true,
				description: true
			},
			orderBy: { createdAt: 'desc' },
			skip: offset,
			take: limit
		})

		// Transform albums to PhotoAlbum format
		const photoAlbums: PhotoAlbum[] = albums
			.filter(album => album.photos.length > 0) // Only include albums with published photos
			.map(album => ({
				id: `album-${album.id}`,
				slug: album.slug, // Add slug for navigation
				title: album.title,
				description: album.description || undefined,
				coverPhoto: {
					id: `cover-${album.photos[0].id}`,
					src: album.photos[0].url,
					alt: album.photos[0].caption || album.title,
					caption: album.photos[0].caption || undefined,
					width: album.photos[0].width || 400,
					height: album.photos[0].height || 400
				},
				photos: album.photos.map(photo => ({
					id: `photo-${photo.id}`,
					src: photo.url,
					alt: photo.caption || photo.filename,
					caption: photo.caption || undefined,
					width: photo.width || 400,
					height: photo.height || 400
				})),
				createdAt: album.createdAt.toISOString()
			}))

		// Transform individual photos to Photo format
		const photos: Photo[] = individualPhotos.map(photo => ({
			id: `photo-${photo.id}`,
			src: photo.url,
			alt: photo.title || photo.caption || photo.filename,
			caption: photo.caption || undefined,
			width: photo.width || 400,
			height: photo.height || 400
		}))

		// Combine albums and individual photos
		const photoItems: PhotoItem[] = [...photoAlbums, ...photos]

		// Sort by creation date (albums use createdAt, individual photos would need publishedAt or createdAt)
		photoItems.sort((a, b) => {
			const dateA = 'createdAt' in a ? new Date(a.createdAt) : new Date()
			const dateB = 'createdAt' in b ? new Date(b.createdAt) : new Date()
			return dateB.getTime() - dateA.getTime()
		})

		const response = {
			photoItems,
			pagination: {
				total: photoItems.length,
				limit,
				offset,
				hasMore: photoItems.length === limit // Simple check, could be more sophisticated
			}
		}

		return jsonResponse(response)
	} catch (error) {
		logger.error('Failed to fetch photos', error as Error)
		return errorResponse('Failed to fetch photos', 500)
	}
}