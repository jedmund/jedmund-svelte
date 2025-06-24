import type { PageLoad } from './$types'

export const load: PageLoad = async ({ fetch }) => {
	try {
		const response = await fetch('/api/albums?limit=20&offset=0')
		if (!response.ok) {
			throw new Error('Failed to load albums')
		}

		const data = await response.json()
		return {
			albums: data.albums || [],
			pagination: data.pagination || {
				total: 0,
				limit: 20,
				offset: 0,
				hasMore: false
			}
		}
	} catch (error) {
		console.error('Error loading albums:', error)
		return {
			albums: [],
			pagination: {
				total: 0,
				limit: 20,
				offset: 0,
				hasMore: false
			},
			error: error instanceof Error ? error.message : 'Failed to load albums'
		}
	}
}
