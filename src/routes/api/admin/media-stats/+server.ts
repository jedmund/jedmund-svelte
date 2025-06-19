import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse, checkAdminAuth } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'
import { isGreyColor } from '$lib/server/color-utils'

export const GET: RequestHandler = async (event) => {
	// Check authentication
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	try {
		// Get total media count
		const totalMedia = await prisma.media.count()

		// Count media missing dominant color
		const missingColors = await prisma.media.count({
			where: {
				dominantColor: null,
				mimeType: {
					startsWith: 'image/'
				}
			}
		})

		// Count media missing aspect ratio
		const missingAspectRatio = await prisma.media.count({
			where: {
				aspectRatio: null,
				mimeType: {
					startsWith: 'image/'
				}
			}
		})

		// Count media with outdated thumbnails (800x600 fixed size)
		const outdatedThumbnails = await prisma.media.count({
			where: {
				thumbnailUrl: {
					contains: 'w_800,h_600,c_fill'
				},
				mimeType: {
					startsWith: 'image/'
				}
			}
		})

		// Count media with grey dominant colors
		const mediaWithColors = await prisma.media.findMany({
			where: {
				dominantColor: { not: null },
				mimeType: { startsWith: 'image/' }
			},
			select: { dominantColor: true }
		})

		const greyDominantColors = mediaWithColors.filter(
			media => media.dominantColor && isGreyColor(media.dominantColor)
		).length

		const stats = {
			totalMedia,
			missingColors,
			missingAspectRatio,
			outdatedThumbnails,
			greyDominantColors
		}

		logger.info('Media stats fetched', stats)

		return jsonResponse(stats)
	} catch (error) {
		logger.error('Failed to fetch media stats', error as Error)
		return errorResponse(
			`Failed to fetch media stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
			500
		)
	}
}