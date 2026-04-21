import type { RequestHandler } from './$types'
import { jsonResponse, errorResponse } from '$lib/server/api-utils'
import { validatePreviewToken, getUnlockedProjectIds } from '$lib/server/admin/session'
import { logger } from '$lib/server/logger'
import { getProjectBySlug, sanitizeProjectForViewer } from '$lib/server/queries/projects'

// GET /api/projects/by-slug/[slug] - Get project by slug
export const GET: RequestHandler = async (event) => {
	const slug = event.params.slug

	if (!slug) {
		return errorResponse('Invalid project slug', 400)
	}

	const previewToken = event.url.searchParams.get('preview')
	let isPreview = false
	if (previewToken) {
		const preview = validatePreviewToken(previewToken)
		if (preview && preview.slug === slug && preview.contentType === 'project') {
			isPreview = true
		}
	}

	try {
		const project = await getProjectBySlug(slug)

		if (!project) {
			return errorResponse('Project not found', 404)
		}

		if (!isPreview) {
			const allowedStatuses = ['published', 'list-only', 'password-protected']
			if (!allowedStatuses.includes(project.status)) {
				return errorResponse('Project not found', 404)
			}
		}

		const unlockedIds = getUnlockedProjectIds(event.cookies)
		return jsonResponse(sanitizeProjectForViewer(project, { unlockedIds }))
	} catch (error) {
		logger.error('Failed to retrieve project by slug', error as Error)
		return errorResponse('Failed to retrieve project', 500)
	}
}
