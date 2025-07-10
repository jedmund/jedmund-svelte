import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'
import type { PhotoItem, PhotoAlbum, Photo } from '$lib/types/photos'

// GET /api/photos - Get individual photos only (albums excluded from collection)
export const GET: RequestHandler = async (event) => {
	try {
		const url = new URL(event.request.url)
		const limit = parseInt(url.searchParams.get('limit') || '50')
		const offset = parseInt(url.searchParams.get('offset') || '0')

		// Fetch all individual photos marked for photography
		// Note: This now includes photos in albums as per the new design
		const individualMedia = await prisma.media.findMany({
			where: {
				isPhotography: true
			},
			select: {
				id: true,
				photoSlug: true,
				filename: true,
				url: true,
				thumbnailUrl: true,
				width: true,
				height: true,
				dominantColor: true,
				colors: true,
				aspectRatio: true,
				photoCaption: true,
				photoTitle: true,
				photoDescription: true,
				createdAt: true,
				photoPublishedAt: true,
				exifData: true
			},
			orderBy: [{ photoPublishedAt: 'desc' }, { createdAt: 'desc' }]
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
				dominantColor: media.dominantColor || undefined,
				colors: media.colors || undefined,
				aspectRatio: media.aspectRatio || undefined,
				createdAt: photoDate.toISOString()
			}
		})

		// Sort photos by the actual date taken (from EXIF or fallback dates)
		photos.sort((a, b) => {
			const dateA = new Date(a.createdAt).getTime()
			const dateB = new Date(b.createdAt).getTime()
			return dateB - dateA // Descending order (newest first)
		})

		// Apply pagination
		const totalItems = photos.length
		const paginatedItems = photos.slice(offset, offset + limit)

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
