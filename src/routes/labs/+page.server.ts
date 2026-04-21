import type { PageServerLoad } from './$types'
import type { Project } from '$lib/types/project'
import { getProjects, sanitizeProjectList } from '$lib/server/queries/projects'
import { getUnlockedProjectIds } from '$lib/server/admin/session'
import { logger } from '$lib/server/logger'

export const load: PageServerLoad = async ({ cookies, setHeaders }) => {
	// private: response includes per-viewer project unlock state, so a shared
	// cache would leak one viewer's unlocked gallery/caseStudyContent to others.
	setHeaders({ 'cache-control': 'private, max-age=60' })

	try {
		const { projects } = await getProjects({
			isAdmin: false,
			projectType: 'labs',
			includeListOnly: true,
			includePasswordProtected: true,
			page: 1,
			limit: 50
		})
		const safe = sanitizeProjectList(projects, { unlockedIds: getUnlockedProjectIds(cookies) })
		return { projects: safe as unknown as Project[] }
	} catch (error) {
		logger.error('Failed to load labs projects', error as Error)
		return {
			projects: [] as Project[],
			error: 'Failed to load projects'
		}
	}
}
