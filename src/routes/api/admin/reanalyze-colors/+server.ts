import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse, checkAdminAuth } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'
import { selectBestDominantColor, isGreyColor } from '$lib/server/color-utils'

export const POST: RequestHandler = async (event) => {
	// Check authentication
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	try {
		const results = {
			processed: 0,
			updated: 0,
			skipped: 0,
			errors: [] as string[]
		}

		// Get all media with color data (prioritize those with grey dominant colors)
		const mediaWithColors = await prisma.media.findMany({
			where: {
				colors: { not: null },
				mimeType: { startsWith: 'image/' }
			},
			select: {
				id: true,
				filename: true,
				dominantColor: true,
				colors: true
			}
		})

		logger.info(`Found ${mediaWithColors.length} media items with color data`)

		// Process each media item
		for (const media of mediaWithColors) {
			try {
				results.processed++

				if (!media.colors || !Array.isArray(media.colors)) {
					results.skipped++
					continue
				}

				const currentColor = media.dominantColor
				const colors = media.colors as Array<[string, number]>

				// Calculate new dominant color with smart selection
				const newColor = selectBestDominantColor(colors, {
					minPercentage: 2,
					preferVibrant: true,
					excludeGreys: false,
					preferBrighter: true
				})

				// Only update if the color changed significantly
				// (either was grey and now isn't, or is a different color)
				const wasGrey = currentColor ? isGreyColor(currentColor) : false
				const isNewGrey = isGreyColor(newColor)
				const changed = currentColor !== newColor && (wasGrey || !isNewGrey)

				if (changed) {
					// Update media
					await prisma.media.update({
						where: { id: media.id },
						data: { dominantColor: newColor }
					})

					// Update related photos
					await prisma.photo.updateMany({
						where: { mediaId: media.id },
						data: { dominantColor: newColor }
					})

					results.updated++

					logger.info(`Updated dominant color for ${media.filename}`, {
						from: currentColor,
						to: newColor,
						wasGrey,
						isNewGrey
					})
				} else {
					results.skipped++
				}
			} catch (error) {
				const errorMessage = `Media ID ${media.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
				results.errors.push(errorMessage)
				logger.error('Failed to reanalyze colors for media', {
					mediaId: media.id,
					error: error as Error
				})
			}
		}

		logger.info('Color reanalysis completed', results)

		return jsonResponse(results)
	} catch (error) {
		logger.error('Color reanalysis error', error as Error)
		return errorResponse(
			`Color reanalysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
			500
		)
	}
}
