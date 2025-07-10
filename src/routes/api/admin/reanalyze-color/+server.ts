import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import {
	jsonResponse,
	errorResponse,
	checkAdminAuth,
	parseRequestBody
} from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'
import { selectBestDominantColor, getVibrantPalette } from '$lib/server/color-utils'

export const POST: RequestHandler = async (event) => {
	// Check authentication
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	try {
		const body = await parseRequestBody<{ mediaId: number }>(event.request)

		if (!body?.mediaId) {
			return errorResponse('Media ID is required', 400)
		}

		// Get media with existing color data
		const media = await prisma.media.findUnique({
			where: { id: body.mediaId },
			select: {
				id: true,
				filename: true,
				colors: true,
				dominantColor: true
			}
		})

		if (!media) {
			return errorResponse('Media not found', 404)
		}

		if (!media.colors || !Array.isArray(media.colors)) {
			return errorResponse('No color data available for this media', 400)
		}

		// Reanalyze colors with different strategies
		const strategies = {
			// Default: balanced approach with brightness preference
			default: selectBestDominantColor(media.colors as Array<[string, number]>, {
				minPercentage: 2,
				preferVibrant: true,
				excludeGreys: false,
				preferBrighter: true
			}),

			// Vibrant: exclude greys completely, prefer bright
			vibrant: selectBestDominantColor(media.colors as Array<[string, number]>, {
				minPercentage: 1,
				preferVibrant: true,
				excludeGreys: true,
				preferBrighter: true
			}),

			// Prominent: focus on larger color areas
			prominent: selectBestDominantColor(media.colors as Array<[string, number]>, {
				minPercentage: 5,
				preferVibrant: false,
				excludeGreys: false,
				preferBrighter: true
			})
		}

		// Get vibrant palette
		const vibrantPalette = getVibrantPalette(media.colors as Array<[string, number]>)

		// Return analysis results
		return jsonResponse({
			media: {
				id: media.id,
				filename: media.filename,
				currentDominantColor: media.dominantColor,
				colors: media.colors
			},
			analysis: {
				strategies,
				vibrantPalette,
				recommendation: strategies.default
			}
		})
	} catch (error) {
		logger.error('Color reanalysis error', error as Error)
		return errorResponse(
			`Color reanalysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
			500
		)
	}
}

// PUT endpoint to update with new color
export const PUT: RequestHandler = async (event) => {
	// Check authentication
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	try {
		const body = await parseRequestBody<{
			mediaId: number
			dominantColor: string
		}>(event.request)

		if (!body?.mediaId || !body?.dominantColor) {
			return errorResponse('Media ID and dominant color are required', 400)
		}

		// Update media
		const updated = await prisma.media.update({
			where: { id: body.mediaId },
			data: { dominantColor: body.dominantColor }
		})

		// Also update any photos using this media
		await prisma.photo.updateMany({
			where: { mediaId: body.mediaId },
			data: { dominantColor: body.dominantColor }
		})

		logger.info('Dominant color updated', {
			mediaId: body.mediaId,
			color: body.dominantColor
		})

		return jsonResponse({
			success: true,
			media: updated
		})
	} catch (error) {
		logger.error('Color update error', error as Error)
		return errorResponse(
			`Color update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
			500
		)
	}
}
