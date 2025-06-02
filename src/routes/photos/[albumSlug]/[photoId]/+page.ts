import type { PageLoad } from './$types'

export const load: PageLoad = async ({ params, fetch }) => {
	try {
		const response = await fetch(`/api/photos/${params.albumSlug}/${params.photoId}`)
		
		if (!response.ok) {
			if (response.status === 404) {
				throw new Error('Photo not found')
			}
			throw new Error('Failed to fetch photo')
		}

		const data = await response.json()

		return {
			photo: data.photo,
			album: data.album,
			navigation: data.navigation
		}
	} catch (error) {
		console.error('Error loading photo:', error)
		return {
			photo: null,
			album: null,
			navigation: null,
			error: error instanceof Error ? error.message : 'Failed to load photo'
		}
	}
}