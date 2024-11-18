import type { PageLoad } from './$types'
import type { Album } from '$lib/types/lastfm'

export const load: PageLoad = async ({ fetch }) => {
	try {
		// const [albums, steamGames, psnGames] = await Promise.all([
		const [albums] = await Promise.all([
			fetchRecentAlbums(fetch)
			// fetchRecentSteamGames(fetch),
			// fetchRecentPSNGames(fetch)
		])

		// const response = await fetch('/api/giantbomb', {
		// 	method: 'POST',
		// 	body: JSON.stringify({ games: psnGames }),
		// 	headers: {
		// 		'Content-Type': 'application/json'
		// 	}
		// })

		// const games = await response.json()
		return {
			albums
			// games: games,
			// steamGames: steamGames,
			// psnGames: psnGames
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

async function fetchRecentSteamGames(fetch: typeof window.fetch): Promise<SerializableGameInfo[]> {
	const response = await fetch('/api/steam')
	if (!response.ok) {
		throw new Error(`Failed to fetch recent game: ${response.status}`)
	}
	return await response.json()
}

async function fetchRecentPSNGames(fetch: typeof window.fetch): Promise<SerializableGameInfo[]> {
	const response = await fetch('/api/psn')
	if (!response.ok) {
		throw new Error(`Failed to fetch recent game: ${response.status}`)
	}
	return await response.json()
}
