import type { RequestHandler } from './$types'
import { jsonResponse, errorResponse, checkAdminAuth } from '$lib/server/api-utils'
import { generatePreviewToken } from '$lib/server/admin/session'

// POST /api/preview/generate - Generate a preview token
export const POST: RequestHandler = async (event) => {
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	try {
		const { contentType, slug } = await event.request.json()

		if (!contentType || !slug) {
			return errorResponse('contentType and slug are required', 400)
		}

		if (!['post', 'project'].includes(contentType)) {
			return errorResponse('contentType must be "post" or "project"', 400)
		}

		const token = generatePreviewToken(contentType, slug)

		const basePath = contentType === 'post' ? '/universe' : '/work'
		const url = `${basePath}/${slug}?preview=${token}`

		return jsonResponse({ token, url })
	} catch {
		return errorResponse('Failed to generate preview token', 500)
	}
}
