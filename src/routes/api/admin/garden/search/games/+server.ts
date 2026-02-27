import 'dotenv/config'
import redis from '../../../../redis-client'

import type { RequestHandler } from './$types'
import { jsonResponse, errorResponse, checkAdminAuth } from '$lib/server/api-utils'

const CACHE_TTL = 60 * 60 // 1 hour
const TOKEN_CACHE_KEY = 'igdb:access_token'

async function getAccessToken(): Promise<string> {
	const cached = await redis.get(TOKEN_CACHE_KEY)
	if (cached) return cached

	const res = await fetch(
		`https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
		{ method: 'POST' }
	)

	if (!res.ok) {
		throw new Error(`Twitch auth failed: ${res.status}`)
	}

	const data = await res.json()
	const token = data.access_token
	const ttl = Math.max(data.expires_in - 60, 3600) // expire a minute early, min 1 hour

	await redis.setex(TOKEN_CACHE_KEY, ttl, token)
	return token
}

function getCoverUrl(imageId: string): string {
	return `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg`
}

export const GET: RequestHandler = async (event) => {
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	const query = event.url.searchParams.get('q')?.trim()
	if (!query) {
		return errorResponse('Query parameter "q" is required')
	}

	const limit = Math.min(10, Math.max(1, parseInt(event.url.searchParams.get('limit') || '5')))

	const cacheKey = `igdb:search:${query.toLowerCase()}`
	const cachedData = await redis.get(cacheKey)
	if (cachedData) {
		return jsonResponse({ results: JSON.parse(cachedData) })
	}

	try {
		const accessToken = await getAccessToken()

		const body = `fields name, cover.image_id, involved_companies.developer, involved_companies.company.name; search "${query.replace(/"/g, '\\"')}"; limit ${limit};`

		const res = await fetch('https://api.igdb.com/v4/games', {
			method: 'POST',
			headers: {
				'Client-ID': process.env.TWITCH_CLIENT_ID!,
				Authorization: `Bearer ${accessToken}`,
				Accept: 'application/json'
			},
			body
		})

		if (!res.ok) {
			const text = await res.text()
			console.error('IGDB API error:', res.status, text)
			return errorResponse('Failed to search games', 500)
		}

		const games = await res.json()
		const results = games.map(
			(game: {
				id: number
				name: string
				cover?: { image_id: string }
				involved_companies?: { developer: boolean; company: { name: string } }[]
			}) => ({
				id: game.id,
				name: game.name,
				image: game.cover?.image_id ? getCoverUrl(game.cover.image_id) : null,
				developer:
					game.involved_companies?.find((c) => c.developer)?.company?.name || null
			})
		)

		await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(results))
		return jsonResponse({ results })
	} catch (error) {
		console.error('IGDB search error:', error)
		return errorResponse('Failed to search games', 500)
	}
}
