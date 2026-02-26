import type { PageLoad } from './$types'

export const load: PageLoad = async ({ params, fetch, url }) => {
	try {
		// Forward preview token if present
		const preview = url.searchParams.get('preview')
		const apiUrl = preview
			? `/api/projects/by-slug/${params.slug}?preview=${encodeURIComponent(preview)}`
			: `/api/projects/by-slug/${params.slug}`

		const response = await fetch(apiUrl)

		if (!response.ok) {
			if (response.status === 404) {
				throw new Error('Project not found')
			}
			throw new Error('Failed to fetch project')
		}

		const project = await response.json()

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
