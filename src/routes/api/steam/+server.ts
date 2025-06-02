import 'dotenv/config'
import { error, json } from '@sveltejs/kit'
import redis from '../redis-client'
import SteamAPI from 'steamapi'

import type { RequestHandler } from './$types'

const CACHE_TTL = 60 * 60 // 1 hour
const STEAM_ID = '76561197997279808'

export const GET: RequestHandler = async ({ params }) => {
	try {
		// Check if data is in cache
		const cachedData = await redis.get(`steam:${STEAM_ID}`)
		if (cachedData) {
			console.log('Using cached Steam data')
			return new Response(cachedData, {
				headers: { 'Content-Type': 'application/json' }
			})
		}

		// If not in cache, fetch and cache the data
		const games = await getSerializedGames(STEAM_ID)

		return new Response(JSON.stringify(games), {
			headers: { 'Content-Type': 'application/json' }
		})
	} catch (err) {
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

async function getSerializedGames(steamId: string): Promise<SerializableGameInfo[]> {
	// Fetch all owned games from Steam
	// This is necessary because the recently played API only returns games played in the last 14 days.
	const steam = new SteamAPI(process.env.STEAM_API_KEY || '')
	const steamGames = await steam.getUserOwnedGames(steamId, { includeExtendedAppInfo: true })

	// Sort games based on when they were last played and take the first five games.
	// Then, ensure that we use the getter method to fetch the cover URL.
	const sortedGames = sortUserPlaytimes(steamGames).slice(0, 5)
	const extendedGames = sortedGames.filter(
		(game): game is UserPlaytime<GameInfoExtended> => 'coverURL' in game.game
	)

	// Map the games to a serializable format that the frontend understands.
	let games: SerializableGameInfo[] = extendedGames.map((game) => ({
		id: game.game.id,
		name: game.game.name,
		playtime: game.minutes,
		lastPlayed: game.lastPlayedAt,
		coverURL: game.game.coverURL,
		platform: 'steam'
	}))

	await redis.setex(`steam:${STEAM_ID}`, CACHE_TTL, JSON.stringify(games))
	return games
}
