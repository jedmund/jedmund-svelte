import type { PageLoad } from './$types'

export const load: PageLoad = async ({ fetch }) => {
	try {
		const response = await fetch('/api/photos?limit=50')
		if (!response.ok) {
			throw new Error('Failed to fetch photos')
		}

		const data = await response.json()
		return {
			photoItems: data.photoItems || [],
			pagination: data.pagination || null
		}
	} catch (error) {
		console.error('Error loading photos:', error)

		// Fallback to empty array if API fails
		return {
			photoItems: [],
			pagination: null,
			error: 'Failed to load photos'
		}
	}
}
