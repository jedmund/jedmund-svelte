import 'dotenv/config'
import type { AuthTokensResponse, RecentlyPlayedGamesResponse } from 'psn-api'
import type { RequestHandler } from './$types'

import Module from 'node:module'
const require = Module.createRequire(import.meta.url)
const {
	exchangeNpssoForCode,
	exchangeCodeForAccessToken,
	getRecentlyPlayedGames
} = require('psn-api')

const PSN_NPSSO_TOKEN = process.env.PSN_NPSSO_TOKEN

export const GET: RequestHandler = async ({ url }) => {
	let authorization = await authorize(PSN_NPSSO_TOKEN || '')

	const response: RecentlyPlayedGamesResponse = await getRecentlyPlayedGames(authorization, {
		limit: 5,
		categories: ['ps4_game', 'ps5_native_game']
	})

	const games: SerializableGameInfo[] = response.data.gameLibraryTitlesRetrieve.games.map(
		(game) => ({
			id: game.productId,
			name: game.name,
			playtime: undefined,
			lastPlayed: new Date(game.lastPlayedDateTime),
			coverURL: game.image.url
		})
	)

	return new Response(JSON.stringify(games), {
		headers: { 'Content-Type': 'application/json' }
	})
}

async function authorize(npsso: string): Promise<AuthTokensResponse> {
	const accessCode = await exchangeNpssoForCode(npsso)
	const authorization = await exchangeCodeForAccessToken(accessCode)
	return authorization
}
