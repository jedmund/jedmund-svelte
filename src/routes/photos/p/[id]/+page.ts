import type { PageLoad } from './$types'

export const load: PageLoad = async ({ params, fetch }) => {
	try {
		const mediaId = parseInt(params.id)
		if (isNaN(mediaId)) {
			throw new Error('Invalid media ID')
		}

		// Fetch the photo by media ID
		const photoResponse = await fetch(`/api/photos/${mediaId}`)
		if (!photoResponse.ok) {
			if (photoResponse.status === 404) {
				throw new Error('Photo not found')
			}
			throw new Error('Failed to fetch photo')
		}

		const photo = await photoResponse.json()

		// Fetch all photos for the filmstrip navigation
		const allPhotosResponse = await fetch('/api/photos?limit=100')
		let photoItems = []
		if (allPhotosResponse.ok) {
			const data = await allPhotosResponse.json()
			photoItems = data.photoItems || []
		}

		return {
			photo,
			photoItems,
			currentPhotoId: `media-${mediaId}` // Updated to use media prefix
		}
	} catch (error) {
		console.error('Error loading photo:', error)
		return {
			photo: null,
			photoItems: [],
			error: error instanceof Error ? error.message : 'Failed to load photo'
		}
	}
}