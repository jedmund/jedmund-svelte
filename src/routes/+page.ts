import type { PageLoad } from './$types'
import type { Album } from '$lib/types/lastfm'
import type { GameInfoExtended, UserPlaytime } from 'steamapi'

export const load: PageLoad = async ({ fetch }) => {
	try {
		const [albums, games] = await Promise.all([fetchRecentAlbums(fetch), fetchRecentGames(fetch)])
		console.log(games[0])
		return {
			albums,
			games
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

async function fetchRecentGames(fetch: typeof window.fetch): Promise<SerializableGameInfo[]> {
	const response = await fetch('/api/steam')
	if (!response.ok) {
		throw new Error(`Failed to fetch recent game: ${response.status}`)
	}
	return await response.json()
}
