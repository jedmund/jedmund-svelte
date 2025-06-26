import type { PageLoad } from './$types'

export const load: PageLoad = async ({ fetch }) => {
	try {
		const response = await fetch('/api/photos?limit=20')
		if (!response.ok) {
			throw new Error('Failed to fetch photos')
		}

		const data = await response.json()
		return {
			photos: data.photoItems || [], // API still returns photoItems but contains only photos
			pagination: data.pagination || null
		}
	} catch (error) {
		console.error('Error loading photos:', error)

		// Fallback to empty array if API fails
		return {
			photos: [],
			pagination: null,
			error: 'Failed to load photos'
		}
	}
}
