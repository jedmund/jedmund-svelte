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
			}
			// Remove orderBy to sort everything together later
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
			}
			// Remove orderBy to sort everything together later
		})

		// Helper function to extract date from EXIF data
		const getPhotoDate = (media: any): Date => {
			// Try to get date from EXIF data
			if (media.exifData && typeof media.exifData === 'object') {
				// Check for common EXIF date fields
				const exif = media.exifData as any
				const dateTaken = exif.DateTimeOriginal || exif.DateTime || exif.dateTaken
				if (dateTaken) {
					// Parse EXIF date format (typically "YYYY:MM:DD HH:MM:SS")
					const parsedDate = new Date(dateTaken.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3'))
					if (!isNaN(parsedDate.getTime())) {
						return parsedDate
					}
				}
			}

			// Fallback to photoPublishedAt
			if (media.photoPublishedAt) {
				return new Date(media.photoPublishedAt)
			}

			// Final fallback to createdAt
			return new Date(media.createdAt)
		}

		// Transform albums to PhotoAlbum format
		const photoAlbums: PhotoAlbum[] = albums
			.filter((album) => album.media.length > 0) // Only include albums with media
			.map((album) => {
				const firstMedia = album.media[0].media

				// Find the most recent EXIF date from all photos in the album
				let albumDate = new Date(album.createdAt)
				for (const albumMedia of album.media) {
					const mediaDate = getPhotoDate(albumMedia.media)
					if (mediaDate > albumDate) {
						albumDate = mediaDate
					}
				}

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
					createdAt: albumDate.toISOString()
				}
			})

		// Transform individual media to Photo format
		const photos: Photo[] = individualMedia.map((media) => {
			// Use the same helper function to get the photo date
			const photoDate = getPhotoDate(media)

			return {
				id: `media-${media.id}`,
				src: media.url,
				alt: media.photoTitle || media.photoCaption || media.filename,
				caption: media.photoCaption || undefined,
				width: media.width || 400,
				height: media.height || 400,
				createdAt: photoDate.toISOString()
			}
		})

		// Combine albums and individual photos
		let allPhotoItems: PhotoItem[] = [...photoAlbums, ...photos]

		// Sort by creation date (both albums and photos now have createdAt)
		// Newest first (reverse chronological)
		allPhotoItems.sort((a, b) => {
			const dateA = a.createdAt ? new Date(a.createdAt) : new Date()
			const dateB = b.createdAt ? new Date(b.createdAt) : new Date()
			return dateB.getTime() - dateA.getTime()
		})

		// Apply pagination after sorting
		const totalItems = allPhotoItems.length
		const paginatedItems = allPhotoItems.slice(offset, offset + limit)

		const response = {
			photoItems: paginatedItems,
			pagination: {
				total: totalItems,
				limit,
				offset,
				hasMore: offset + limit < totalItems
			}
		}

		return jsonResponse(response)
	} catch (error) {
		logger.error('Failed to fetch photos', error as Error)
		return errorResponse('Failed to fetch photos', 500)
	}
}
