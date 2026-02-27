import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse, checkAdminAuth } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'
import { isCloudinaryUrl } from '$lib/server/cloudinary'
import { cacheGardenImage } from '$lib/server/garden-images'

// POST /api/admin/garden/backfill-images - Migrate existing images to Cloudinary
export const POST: RequestHandler = async (event) => {
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	try {
		const items = await prisma.gardenItem.findMany({
			where: {
				sourceImageUrl: null,
				imageUrl: { not: null }
			}
		})

		// Filter to only items with non-Cloudinary URLs
		const toBackfill = items.filter((item) => item.imageUrl && !isCloudinaryUrl(item.imageUrl))

		let success = 0
		let failed = 0
		const skipped = items.length - toBackfill.length

		for (const item of toBackfill) {
			const { imageUrl, sourceImageUrl } = await cacheGardenImage(item.imageUrl, null, null)

			if (imageUrl && sourceImageUrl) {
				await prisma.gardenItem.update({
					where: { id: item.id },
					data: { imageUrl, sourceImageUrl }
				})
				success++
				logger.info('Backfilled garden image', { id: item.id, slug: item.slug })
			} else {
				failed++
				logger.warn('Failed to backfill garden image', { id: item.id, slug: item.slug })
			}
		}

		return jsonResponse({ success, failed, skipped, total: items.length })
	} catch (error) {
		logger.error('Garden image backfill failed', error as Error)
		return errorResponse('Backfill failed', 500)
	}
}
