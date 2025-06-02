import type { PageLoad } from './$types'

export const load: PageLoad = async ({ params, fetch }) => {
	try {
		// Fetch the specific album using the individual album endpoint which includes photos
		const response = await fetch(`/api/albums/by-slug/${params.slug}`)
		if (!response.ok) {
			if (response.status === 404) {
				throw new Error('Album not found')
			}
			throw new Error('Failed to fetch album')
		}

		const album = await response.json()

		// Check if this is a photography album and published
		if (!album.isPhotography || album.status !== 'published') {
			throw new Error('Album not found')
		}

		return {
			album
		}
	} catch (error) {
		console.error('Error loading album:', error)
		return {
			album: null,
			error: error instanceof Error ? error.message : 'Failed to load album'
		}
	}
}
