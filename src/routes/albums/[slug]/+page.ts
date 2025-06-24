import type { PageLoad } from './$types'

export const load: PageLoad = async ({ params, fetch }) => {
	try {
		// Fetch album by slug
		const albumResponse = await fetch(`/api/albums/by-slug/${params.slug}`)
		if (albumResponse.ok) {
			const album = await albumResponse.json()

			// Check if album is published
			if (album.status === 'published') {
				return {
					album
				}
			} else {
				throw new Error('Album not published')
			}
		}

		// Album not found
		throw new Error('Album not found')
	} catch (error) {
		console.error('Error loading album:', error)
		return {
			album: null,
			error: error instanceof Error ? error.message : 'Failed to load album'
		}
	}
}
