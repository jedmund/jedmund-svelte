import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse } from '$lib/server/api-utils'
import { validatePreviewToken } from '$lib/server/admin/session'
import { logger } from '$lib/server/logger'

// GET /api/posts/by-slug/[slug] - Get post by slug
export const GET: RequestHandler = async (event) => {
	const slug = event.params.slug

	if (!slug) {
		return errorResponse('Invalid post slug', 400)
	}

	// Check for preview token
	const previewToken = event.url.searchParams.get('preview')
	let isPreview = false
	if (previewToken) {
		const preview = validatePreviewToken(previewToken)
		if (preview && preview.slug === slug && preview.contentType === 'post') {
			isPreview = true
		}
	}

	try {
		const post = await prisma.post.findUnique({
			where: { slug }
		})

		if (!post) {
			return errorResponse('Post not found', 404)
		}

		// Only return published posts unless valid preview token
		if (!isPreview && (post.status !== 'published' || !post.publishedAt)) {
			return errorResponse('Post not found', 404)
		}

		return jsonResponse(post)
	} catch (error) {
		logger.error('Failed to retrieve post by slug', error as Error)
		return errorResponse('Failed to retrieve post', 500)
	}
}
