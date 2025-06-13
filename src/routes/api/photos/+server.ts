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

		// Fetch published photography albums with their media
		const albums = await prisma.album.findMany({
			where: {
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
								exifData: true
							}
						}
					}
				}
			},
			orderBy: { createdAt: 'desc' },
			skip: offset,
			take: limit
		})

		// Fetch individual photos (marked for photography, not in any album)
		const individualMedia = await prisma.media.findMany({
			where: {
				isPhotography: true,
				albums: {
					none: {} // Media not in any album
				}
			},
			select: {
				id: true,
				photoSlug: true,
				filename: true,
				url: true,
				thumbnailUrl: true,
				width: true,
				height: true,
				photoCaption: true,
				photoTitle: true,
				photoDescription: true,
				createdAt: true,
				photoPublishedAt: true,
				exifData: true
			},
			orderBy: { photoPublishedAt: 'desc' },
			skip: offset,
			take: limit
		})

		// Transform albums to PhotoAlbum format
		const photoAlbums: PhotoAlbum[] = albums
			.filter((album) => album.media.length > 0) // Only include albums with media
			.map((album) => {
				const firstMedia = album.media[0].media
				return {
					id: `album-${album.id}`,
					slug: album.slug,
					title: album.title,
					description: album.description || undefined,
					coverPhoto: {
						id: `cover-${firstMedia.id}`,
						src: firstMedia.url,
						alt: firstMedia.photoCaption || album.title,
						caption: firstMedia.photoCaption || undefined,
						width: firstMedia.width || 400,
						height: firstMedia.height || 400
					},
					photos: album.media.map((albumMedia) => ({
						id: `media-${albumMedia.media.id}`,
						src: albumMedia.media.url,
						alt: albumMedia.media.photoCaption || albumMedia.media.filename,
						caption: albumMedia.media.photoCaption || undefined,
						width: albumMedia.media.width || 400,
						height: albumMedia.media.height || 400
					})),
					createdAt: album.createdAt.toISOString()
				}
			})

		// Transform individual media to Photo format
		const photos: Photo[] = individualMedia.map((media) => {
			// Extract date from EXIF data if available
			let photoDate: string
			if (media.exifData && typeof media.exifData === 'object' && 'dateTaken' in media.exifData) {
				// Use EXIF date if available
				photoDate = media.exifData.dateTaken as string
			} else if (media.photoPublishedAt) {
				// Fall back to published date
				photoDate = media.photoPublishedAt.toISOString()
			} else {
				// Fall back to created date
				photoDate = media.createdAt.toISOString()
			}

			return {
				id: `media-${media.id}`,
				src: media.url,
				alt: media.photoTitle || media.photoCaption || media.filename,
				caption: media.photoCaption || undefined,
				width: media.width || 400,
				height: media.height || 400,
				createdAt: photoDate
			}
		})

		// Combine albums and individual photos
		const photoItems: PhotoItem[] = [...photoAlbums, ...photos]

		// Sort by creation date (both albums and photos now have createdAt)
		photoItems.sort((a, b) => {
			const dateA = a.createdAt ? new Date(a.createdAt) : new Date()
			const dateB = b.createdAt ? new Date(b.createdAt) : new Date()
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
