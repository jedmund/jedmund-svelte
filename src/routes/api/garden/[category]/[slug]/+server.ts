import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse } from '$lib/server/api-utils'
import { validatePreviewToken } from '$lib/server/admin/session'
import { logger } from '$lib/server/logger'
import { isValidCategory } from '$lib/constants/garden'

// GET /api/garden/[category]/[slug] - Get a single garden item (public)
export const GET: RequestHandler = async (event) => {
	const { category, slug } = event.params

	if (!isValidCategory(category)) {
		return errorResponse('Category not found', 404)
	}

	// Check for preview token
	const previewToken = event.url.searchParams.get('preview')
	let isPreview = false
	if (previewToken) {
		const preview = validatePreviewToken(previewToken)
		if (preview && preview.slug === `${category}/${slug}` && preview.contentType === 'garden') {
			isPreview = true
		}
	}

	try {
		const item = await prisma.gardenItem.findUnique({
			where: {
				category_slug: { category, slug }
			}
		})

		if (!item) {
			return errorResponse('Item not found', 404)
		}

		// Only return published items unless valid preview token
		if (!isPreview && item.status !== 'published') {
			return errorResponse('Item not found', 404)
		}

		return jsonResponse(item)
	} catch (error) {
		logger.error('Failed to retrieve garden item', error as Error)
		return errorResponse('Failed to retrieve garden item', 500)
	}
}
