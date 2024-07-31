import type { PageLoad } from './$types'
import type { Album } from '$lib/types/lastfm'

export const load: PageLoad = async ({ fetch }) => {
	try {
		const response = await fetch('/api/lastfm')
		if (!response.ok) throw new Error(`Failed to fetch albums: ${response.status}`)
		const data: { albums: Album[] } = await response.json()
		return { albums: data.albums }
	} catch (err) {
		console.error('Error fetching albums:', err)
		return { albums: [], error: err instanceof Error ? err.message : 'An unknown error occurred' }
	}
}
