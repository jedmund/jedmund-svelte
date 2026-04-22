import type { PageLoad } from './$types'

export const load: PageLoad = async ({ params, fetch, parent }) => {
	const { photoItems } = await parent()

	try {
		const mediaId = parseInt(params.id)
		if (isNaN(mediaId)) {
			throw new Error('Invalid media ID')
		}

		const photoResponse = await fetch(`/api/photos/${mediaId}`)
		if (!photoResponse.ok) {
			if (photoResponse.status === 404) {
				throw new Error('Photo not found')
			}
			throw new Error('Failed to fetch photo')
		}

		const photo = await photoResponse.json()

		return {
			photo,
			photoItems,
			currentPhotoId: `media-${mediaId}`
		}
	} catch (error) {
		console.error('Error loading photo:', error)
		return {
			photo: null,
			photoItems,
			error: error instanceof Error ? error.message : 'Failed to load photo'
		}
	}
}
