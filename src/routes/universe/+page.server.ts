import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ fetch }) => {
	try {
		const response = await fetch('/api/universe?limit=20')
		if (!response.ok) {
			throw new Error('Failed to fetch universe feed')
		}
		
		const data = await response.json()
		return {
			universeItems: data.items || [],
			pagination: data.pagination || null
		}
	} catch (error) {
		console.error('Error loading universe feed:', error)
		return {
			universeItems: [],
			pagination: null,
			error: 'Failed to load universe feed'
		}
	}
}
