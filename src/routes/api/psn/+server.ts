import 'dotenv/config'
import Module from 'node:module'
import redis from '../redis-client'

import type {
	AuthTokensResponse,
	GetUserPlayedTimeResponse,
	RecentlyPlayedGamesResponse
} from 'psn-api'
import type { RequestHandler } from './$types'

const require = Module.createRequire(import.meta.url)
const {
	exchangeNpssoForCode,
	exchangeCodeForAccessToken,
	getRecentlyPlayedGames,
	getUserPlayedTime
} = require('psn-api')

const CACHE_TTL = 60 * 60 // 1 hour
const PSN_NPSSO_TOKEN = process.env.PSN_NPSSO_TOKEN
const PSN_ID = '1275018559140296533'

export const GET: RequestHandler = async ({ url }) => {
	// Check if data is in cache
	const cachedData = await redis.get(`psn:${PSN_ID}`)
	if (cachedData) {
		console.log('Using cached PSN data')
		return new Response(cachedData, {
			headers: { 'Content-Type': 'application/json' }
		})
	}

	// If not in cache, fetch and cache the data
	const games = await getSerializedGames(PSN_ID)

	return new Response(JSON.stringify(games), {
		headers: { 'Content-Type': 'application/json' }
	})
}

async function authorize(npsso: string): Promise<AuthTokensResponse> {
	const accessCode = await exchangeNpssoForCode(npsso)
	const authorization = await exchangeCodeForAccessToken(accessCode)
	return authorization
}

async function getSerializedGames(psnId: string): Promise<SerializableGameInfo[]> {
	// Authorize with PSN and get games sorted by last played time
	const authorization = await authorize(PSN_NPSSO_TOKEN || '')
	const response = await getUserPlayedTime(authorization, PSN_ID, {
		limit: 5,
		categories: ['ps4_game', 'ps5_native_game']
	})

	// Map the games to a serializable format that the frontend understands.
	const games: SerializableGameInfo[] = response.titles.map((game: GetUserPlayedTimeResponse) => ({
		id: game.concept.id,
		name: game.name,
		playtime: game.playDuration,
		lastPlayed: game.lastPlayedDateTime,
		coverURL: game.imageUrl,
		platform: 'psn'
	}))

	await redis.setex(`psn:${PSN_ID}`, CACHE_TTL, JSON.stringify(games))
	return games
}
