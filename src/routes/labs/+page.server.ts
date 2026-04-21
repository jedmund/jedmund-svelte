import type { PageServerLoad } from './$types'
import type { Project } from '$lib/types/project'
import { getProjects, sanitizeProjectList } from '$lib/server/queries/projects'
import { getUnlockedProjectIds } from '$lib/server/admin/session'
import { logger } from '$lib/server/logger'

export const load: PageServerLoad = async ({ cookies, setHeaders }) => {
	setHeaders({ 'cache-control': 'public, max-age=1800, stale-while-revalidate=86400' })

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
