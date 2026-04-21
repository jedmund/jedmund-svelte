import type { PageServerLoad } from './$types'
import type { Album } from '$lib/types/lastfm'
import type { Project } from '$lib/types/project'
import { getProjects, sanitizeProjectList } from '$lib/server/queries/projects'
import { getUnlockedProjectIds } from '$lib/server/admin/session'
import { logger } from '$lib/server/logger'

export const load: PageServerLoad = async ({ fetch, cookies, setHeaders }) => {
	// private: response includes per-viewer project unlock state, so a shared
	// cache would leak one viewer's unlocked gallery/caseStudyContent to others.
	setHeaders({ 'cache-control': 'private, max-age=60' })

	const unlockedIds = getUnlockedProjectIds(cookies)

	const [albums, projects] = await Promise.all([
		loadRecentAlbums(fetch),
		loadWorkProjects(unlockedIds)
	])

	return { albums, projects }
}

async function loadRecentAlbums(fetch: typeof globalThis.fetch): Promise<Album[]> {
	try {
		const response = await fetch('/api/lastfm')
		if (!response.ok) throw new Error(`Failed to fetch albums: ${response.status}`)
		const musicData: { albums: Album[] } = await response.json()
		return musicData.albums
	} catch (error) {
		logger.error('Failed to load recent albums', error as Error)
		return []
	}
}

async function loadWorkProjects(unlockedIds: number[]): Promise<Project[]> {
	try {
		const { projects } = await getProjects({
			isAdmin: false,
			projectType: 'work',
			includeListOnly: true,
			includePasswordProtected: true,
			page: 1,
			limit: 50
		})
		return sanitizeProjectList(projects, { unlockedIds }) as unknown as Project[]
	} catch (error) {
		logger.error('Failed to load work projects', error as Error)
		return []
	}
}
