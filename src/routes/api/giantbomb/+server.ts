import 'dotenv/config'
import { promisify } from 'util'
import redis from '../redis-client'
import GiantBombAPI from 'giantbombing-api'

import type { RequestHandler } from './$types'
import type { SerializableGameInfo } from '$lib/types/steam'

const CACHE_TTL = 60 * 60 // 1 hour

const giantBombAPI = new GiantBombAPI({
	apiKey: process.env.GIANTBOMB_API_KEY,
	userAgent: 'jedmund.com/1.0'
})

const getSearchAsync = promisify(giantBombAPI.getSearch.bind(giantBombAPI))

export const POST: RequestHandler = async ({ request }) => {
	const { games } = await request.json()
	const results = await Promise.all(games.map(getCachedOrFetchGame))
	return new Response(JSON.stringify(results))
}

async function getCachedOrFetchGame(game: SerializableGameInfo): Promise<SerializableGameInfo> {
	const cachedData = await redis.get(`giantbomb:${game.name}`)
	if (cachedData) {
		console.log(`Using cached data for Giant Bomb data about ${game.name}`)
		return JSON.parse(cachedData)
	}

	const options = {
		query: game.name,
		resources: 'game',
		resource_type: 'game',
		limit: 1
	}

	try {
		const response = await getSearchAsync(options)
		const revisedGame = {
			...game,
			coverURL: response.results[0].image.medium_url
		}

		await redis.setex(`giantbomb:${game.name}`, CACHE_TTL, JSON.stringify(revisedGame))
		return revisedGame
	} catch (error) {
		console.error(`Error fetching data for ${game.name}:`, error)
		return game // Return original game if fetch fails
	}
}
