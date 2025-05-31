import type { PageLoad } from './$types'
import type { Project } from '$lib/types/project'

export const load: PageLoad = async ({ params, fetch }) => {
	try {
		// Find project by slug
		const response = await fetch(`/api/projects?status=published`)
		if (!response.ok) {
			throw new Error('Failed to fetch projects')
		}

		const data = await response.json()
		const project = data.projects.find((p: Project) => p.slug === params.slug)

		if (!project) {
			throw new Error('Project not found')
		}

		return {
			project
		}
	} catch (error) {
		console.error('Error loading project:', error)
		return {
			project: null,
			error: error instanceof Error ? error.message : 'Failed to load project'
		}
	}
}
