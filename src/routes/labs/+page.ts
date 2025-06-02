import type { PageLoad } from './$types'

export const load: PageLoad = async ({ fetch }) => {
	try {
		const response = await fetch('/api/projects?projectType=labs&includeListOnly=true&includePasswordProtected=true')
		if (!response.ok) {
			throw new Error('Failed to fetch labs projects')
		}
		
		const data = await response.json()
		return {
			projects: data.projects || []
		}
	} catch (error) {
		console.error('Error loading labs projects:', error)
		return {
			projects: [],
			error: 'Failed to load projects'
		}
	}
}
