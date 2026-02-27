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

		if (!['post', 'project', 'garden'].includes(contentType)) {
			return errorResponse('contentType must be "post", "project", or "garden"', 400)
		}

		const token = generatePreviewToken(contentType, slug)

		let basePath: string
		if (contentType === 'post') basePath = '/universe'
		else if (contentType === 'garden') basePath = '/garden'
		else basePath = '/work'
		const url = `${basePath}/${slug}?preview=${token}`

		return jsonResponse({ token, url })
	} catch {
		return errorResponse('Failed to generate preview token', 500)
	}
}
