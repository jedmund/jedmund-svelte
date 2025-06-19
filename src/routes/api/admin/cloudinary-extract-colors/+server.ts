import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse, checkAdminAuth } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'
import { v2 as cloudinary } from 'cloudinary'
import { extractPublicId } from '$lib/server/cloudinary'
import { selectBestDominantColor } from '$lib/server/color-utils'

export const POST: RequestHandler = async (event) => {
	// Check authentication
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	try {
		// Get media items without dominant color
		const mediaWithoutColor = await prisma.media.findMany({
			where: {
				dominantColor: null,
				mimeType: {
					startsWith: 'image/'
				}
			},
			select: {
				id: true,
				url: true,
				width: true,
				height: true
			}
		})

		logger.info(`Found ${mediaWithoutColor.length} media items without color data`)

		const results = {
			processed: 0,
			succeeded: 0,
			failed: 0,
			errors: [] as string[]
		}

		// Process each media item
		for (const media of mediaWithoutColor) {
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
					// For local files, just calculate aspect ratio
					if (media.width && media.height) {
						await prisma.media.update({
							where: { id: media.id },
							data: {
								aspectRatio: media.width / media.height
							}
						})
						results.succeeded++
					} else {
						results.failed++
					}
					results.processed++
					continue
				}

				// Fetch resource details from Cloudinary with colors
				const resource = await cloudinary.api.resource(publicId, {
					colors: true,
					resource_type: 'image'
				})

				// Extract dominant color using smart selection
				let dominantColor: string | undefined
				if (resource.colors && Array.isArray(resource.colors) && resource.colors.length > 0) {
					dominantColor = selectBestDominantColor(resource.colors, {
						minPercentage: 2,
						preferVibrant: true,
						excludeGreys: false, // Keep greys as fallback
						preferBrighter: true
					})
				}

				// Calculate aspect ratio
				const aspectRatio = resource.width && resource.height 
					? resource.width / resource.height 
					: media.width && media.height 
						? media.width / media.height 
						: undefined

				// Update database
				await prisma.media.update({
					where: { id: media.id },
					data: {
						dominantColor,
						colors: resource.colors,
						aspectRatio,
						// Update dimensions if they were missing
						width: resource.width || media.width,
						height: resource.height || media.height
					}
				})

				results.succeeded++
				results.processed++

				// Log progress every 10 items
				if (results.processed % 10 === 0) {
					logger.info(`Color extraction progress: ${results.processed}/${mediaWithoutColor.length}`)
				}

				// Add a small delay to avoid rate limiting
				await new Promise(resolve => setTimeout(resolve, 100))

			} catch (error) {
				results.failed++
				results.processed++
				const errorMsg = error instanceof Error ? error.message : 'Unknown error'
				results.errors.push(`Media ID ${media.id}: ${errorMsg}`)
				logger.error(`Failed to extract colors for media ${media.id}:`, {
					error: error as Error,
					url: media.url,
					publicId: extractPublicId(media.url)
				})
			}
		}

		// Also update photos table if needed
		const photosWithoutColor = await prisma.photo.findMany({
			where: {
				dominantColor: null,
				mediaId: {
					not: null
				}
			},
			include: {
				media: {
					select: {
						dominantColor: true,
						colors: true,
						aspectRatio: true
					}
				}
			}
		})

		// Update photos with their media's color data
		for (const photo of photosWithoutColor) {
			if (photo.media && photo.media.dominantColor) {
				await prisma.photo.update({
					where: { id: photo.id },
					data: {
						dominantColor: photo.media.dominantColor,
						colors: photo.media.colors,
						aspectRatio: photo.media.aspectRatio
					}
				})
			}
		}

		logger.info('Color extraction completed', results)

		return jsonResponse({
			message: 'Color extraction completed',
			...results,
			photosUpdated: photosWithoutColor.length
		})

	} catch (error) {
		logger.error('Color extraction error', error as Error)
		return errorResponse(
			`Color extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
			500
		)
	}
}