import type { PageServerLoad } from './$types'
import type { Project } from '$lib/types/project'
import { error as kitError } from '@sveltejs/kit'
import { getProjectBySlug, sanitizeProjectForViewer } from '$lib/server/queries/projects'
import { validatePreviewToken, getUnlockedProjectIds } from '$lib/server/admin/session'
import { logger } from '$lib/server/logger'

const PUBLIC_STATUSES = ['published', 'list-only', 'password-protected']

export const load: PageServerLoad = async ({ params, url, cookies }) => {
	try {
		const previewToken = url.searchParams.get('preview')
		const isPreview =
			!!previewToken &&
			(() => {
				const preview = validatePreviewToken(previewToken)
				return !!preview && preview.slug === params.slug && preview.contentType === 'project'
			})()

		const project = await getProjectBySlug(params.slug)

		if (!project) {
			throw kitError(404, 'Project not found')
		}

		if (!isPreview && !PUBLIC_STATUSES.includes(project.status)) {
			throw kitError(404, 'Project not found')
		}

		const safe = sanitizeProjectForViewer(project, {
			unlockedIds: getUnlockedProjectIds(cookies)
		})

		return { project: safe as unknown as Project }
	} catch (error) {
		if (error && typeof error === 'object' && 'status' in error) throw error
		logger.error('Failed to load project by slug', error as Error)
		return {
			project: null,
			error: error instanceof Error ? error.message : 'Failed to load project'
		}
	}
}
