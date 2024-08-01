import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import SteamAPI, { Game, GameInfo, GameInfoExtended, UserPlaytime } from 'steamapi'

export const GET: RequestHandler = async ({ params }) => {
	const steam = new SteamAPI(process.env.STEAM_API_KEY || '')
	try {
		const steamId = '76561197997279808'

		const ownedGames = await steam.getUserOwnedGames(steamId, { includeExtendedAppInfo: true })

		const sortedGames = sortUserPlaytimes(ownedGames).slice(0, 5)
		const extendedGames = sortedGames.filter(
			(game): game is UserPlaytime<GameInfoExtended> => 'coverURL' in game.game
		)
		const serializableGames: SerializableGameInfo[] = extendedGames.map((game) => ({
			id: game.game.id,
			name: game.game.name,
			playtime: game.minutes,
			coverURL: game.game.coverURL
		}))

		return new Response(JSON.stringify(serializableGames), {
			headers: { 'Content-Type': 'application/json' }
		})
	} catch (err) {
		console.log('Catching here')
		console.error('Error fetching recent game:', err)
		throw error(500, 'Error fetching recent game data')
	}
}

function sortUserPlaytimes(
	userPlaytimes: UserPlaytime<GameInfoExtended | Game | GameInfo>[]
): UserPlaytime<GameInfoExtended | Game | GameInfo>[] {
	return userPlaytimes.sort((a, b) => {
		if (a.lastPlayedTimestamp === undefined && b.lastPlayedTimestamp === undefined) {
			// Both games have never been played, sort by total minutes (which will be 0)
			return b.minutes - a.minutes // This will always be 0 - 0, but we keep it for consistency
		}
		if (a.lastPlayedTimestamp === undefined) return 1 // a goes after b
		if (b.lastPlayedTimestamp === undefined) return -1 // a goes before b

		// If both have lastPlayedTimestamp, compare them
		if (a.lastPlayedTimestamp !== b.lastPlayedTimestamp) {
			return b.lastPlayedTimestamp - a.lastPlayedTimestamp
		}

		// If lastPlayedTimestamp is the same, compare total minutes
		return b.minutes - a.minutes
	})
}
