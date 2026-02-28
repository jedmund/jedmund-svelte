import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse } from '$lib/server/api-utils'
import { validatePreviewToken, getUnlockedProjectIds } from '$lib/server/admin/session'
import { logger } from '$lib/server/logger'

// GET /api/projects/by-slug/[slug] - Get project by slug
export const GET: RequestHandler = async (event) => {
	const slug = event.params.slug

	if (!slug) {
		return errorResponse('Invalid project slug', 400)
	}

	// Check for preview token
	const previewToken = event.url.searchParams.get('preview')
	let isPreview = false
	if (previewToken) {
		const preview = validatePreviewToken(previewToken)
		if (preview && preview.slug === slug && preview.contentType === 'project') {
			isPreview = true
		}
	}

	try {
		const project = await prisma.project.findUnique({
			where: { slug }
		})

		if (!project) {
			return errorResponse('Project not found', 404)
		}

		// Allow draft projects with valid preview token
		if (!isPreview) {
			const allowedStatuses = ['published', 'list-only', 'password-protected']
			if (!allowedStatuses.includes(project.status)) {
				return errorResponse('Project not found', 404)
			}
		}

		// Strip password and handle locked state for non-preview requests
		const { password: _password, ...rest } = project
		if (rest.status === 'password-protected') {
			const unlockedIds = getUnlockedProjectIds(event.cookies)
			const isLocked = !unlockedIds.includes(rest.id)
			if (isLocked) {
				return jsonResponse({ ...rest, caseStudyContent: null, gallery: [], hasPassword: true, locked: true })
			}
			return jsonResponse({ ...rest, hasPassword: true, locked: false })
		}

		return jsonResponse(rest)
	} catch (error) {
		logger.error('Failed to retrieve project by slug', error as Error)
		return errorResponse('Failed to retrieve project', 500)
	}
}
