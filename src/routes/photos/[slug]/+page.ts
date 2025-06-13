import type { PageLoad } from './$types'

export const load: PageLoad = async ({ params, fetch }) => {
	try {
		// First try to fetch as an album
		const albumResponse = await fetch(`/api/albums/by-slug/${params.slug}`)
		if (albumResponse.ok) {
			const album = await albumResponse.json()
			
			// Check if this is a photography album and published
			if (album.isPhotography && album.status === 'published') {
				return {
					type: 'album' as const,
					album,
					photo: null
				}
			}
		}

		// If not found as album or not a photography album, try as individual photo
		const photoResponse = await fetch(`/api/photos/by-slug/${params.slug}`)
		if (photoResponse.ok) {
			const photo = await photoResponse.json()
			return {
				type: 'photo' as const,
				album: null,
				photo
			}
		}

		// Neither album nor photo found
		throw new Error('Content not found')
	} catch (error) {
		console.error('Error loading content:', error)
		return {
			type: null,
			album: null,
			photo: null,
			error: error instanceof Error ? error.message : 'Failed to load content'
		}
	}
}
