import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse, checkAdminAuth } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'
import { v2 as cloudinary } from 'cloudinary'
import { extractPublicId } from '$lib/server/cloudinary'

export const POST: RequestHandler = async (event) => {
	// Check authentication
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	try {
		// Get media items with outdated thumbnails
		const mediaWithOldThumbnails = await prisma.media.findMany({
			where: {
				thumbnailUrl: {
					contains: 'w_800,h_600,c_fill'
				},
				mimeType: {
					startsWith: 'image/'
				}
			},
			select: {
				id: true,
				url: true,
				thumbnailUrl: true,
				width: true,
				height: true
			}
		})

		logger.info(`Found ${mediaWithOldThumbnails.length} media items with outdated thumbnails`)

		const results = {
			processed: 0,
			succeeded: 0,
			failed: 0,
			errors: [] as string[]
		}

		// Process each media item
		for (const media of mediaWithOldThumbnails) {
			try {
				// Extract public ID from URL
				const publicId = extractPublicId(media.url)
				if (!publicId) {
					results.failed++
					results.errors.push(`Could not extract public ID from: ${media.url}`)
					continue
				}

				// Skip local files
				if (publicId.startsWith('local/')) {
					results.processed++
					results.succeeded++
					continue
				}

				// Generate new thumbnail URL with aspect ratio preservation
				// 800px on the longest edge
				let thumbnailUrl: string

				if (media.width && media.height) {
					// Use actual dimensions if available
					if (media.width > media.height) {
						// Landscape: limit width
						thumbnailUrl = cloudinary.url(publicId, {
							secure: true,
							width: 800,
							crop: 'limit',
							quality: 'auto:good',
							fetch_format: 'auto'
						})
					} else {
						// Portrait or square: limit height
						thumbnailUrl = cloudinary.url(publicId, {
							secure: true,
							height: 800,
							crop: 'limit',
							quality: 'auto:good',
							fetch_format: 'auto'
						})
					}
				} else {
					// Fallback: use longest edge limiting
					thumbnailUrl = cloudinary.url(publicId, {
						secure: true,
						width: 800,
						height: 800,
						crop: 'limit',
						quality: 'auto:good',
						fetch_format: 'auto'
					})
				}

				// Update database
				await prisma.media.update({
					where: { id: media.id },
					data: {
						thumbnailUrl
					}
				})

				results.succeeded++
				results.processed++

				// Log progress every 10 items
				if (results.processed % 10 === 0) {
					logger.info(
						`Thumbnail regeneration progress: ${results.processed}/${mediaWithOldThumbnails.length}`
					)
				}

				// Add a small delay to avoid rate limiting
				await new Promise((resolve) => setTimeout(resolve, 50))
			} catch (error) {
				results.failed++
				results.processed++
				const errorMsg = error instanceof Error ? error.message : 'Unknown error'
				results.errors.push(`Media ID ${media.id}: ${errorMsg}`)
				logger.error(`Failed to regenerate thumbnail for media ${media.id}:`, error as Error)
			}
		}

		// Also update photos table thumbnails if they have the old format
		const photosWithOldThumbnails = await prisma.photo.findMany({
			where: {
				thumbnailUrl: {
					contains: 'w_800,h_600,c_fill'
				},
				mediaId: {
					not: null
				}
			},
			include: {
				media: {
					select: {
						thumbnailUrl: true
					}
				}
			}
		})

		// Update photos with their media's new thumbnail URL
		for (const photo of photosWithOldThumbnails) {
			if (photo.media && photo.media.thumbnailUrl) {
				await prisma.photo.update({
					where: { id: photo.id },
					data: {
						thumbnailUrl: photo.media.thumbnailUrl
					}
				})
			}
		}

		logger.info('Thumbnail regeneration completed', results)

		return jsonResponse({
			message: 'Thumbnail regeneration completed',
			...results,
			photosUpdated: photosWithOldThumbnails.length
		})
	} catch (error) {
		logger.error('Thumbnail regeneration error', error as Error)
		return errorResponse(
			`Thumbnail regeneration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
			500
		)
	}
}
