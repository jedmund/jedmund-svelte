import type { PageLoad } from './$types'
import type { Album } from '$lib/types/lastfm'

export const load: PageLoad = async ({ fetch }) => {
	try {
		const [albums] = await Promise.all([
			fetchRecentAlbums(fetch)
		])

		return {
			albums
		}
	} catch (err) {
		console.error('Error fetching data:', err)
		return {
			albums: [],
			games: [],
			error: err instanceof Error ? err.message : 'An unknown error occurred'
		}
	}
}

async function fetchRecentAlbums(fetch: typeof window.fetch): Promise<Album[]> {
	const response = await fetch('/api/lastfm')
	if (!response.ok) throw new Error(`Failed to fetch albums: ${response.status}`)
	const musicData: { albums: Album[] } = await response.json()
	return musicData.albums
}