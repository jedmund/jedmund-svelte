import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse, checkAdminAuth } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'
import redis from '../../../redis-client'

const TVDB_BASE = 'https://api4.thetvdb.com/v4'
const TMDB_BASE = 'https://api.themoviedb.org/3'
const ANILIST_URL = 'https://graphql.anilist.co'

async function getIgdbToken(): Promise<string> {
	const cached = await redis.get('igdb:access_token')
	if (cached) return cached

	const res = await fetch(
		`https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
		{ method: 'POST' }
	)
	const data = await res.json()
	await redis.setex('igdb:access_token', data.expires_in - 60, data.access_token)
	return data.access_token
}

async function getTvdbToken(): Promise<string> {
	const cached = await redis.get('tvdb:access_token')
	if (cached) return cached

	const res = await fetch(`${TVDB_BASE}/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ apikey: process.env.TVDB_API_KEY })
	})
	const data = await res.json()
	await redis.setex('tvdb:access_token', 60 * 60 * 24 * 28, data.data.token)
	return data.data.token
}

async function fetchSummary(category: string, sourceId: string): Promise<string | null> {
	try {
		switch (category) {
			case 'books': {
				const res = await fetch(`https://openlibrary.org${sourceId}.json`)
				if (!res.ok) return null
				const data = await res.json()
				if (typeof data.description === 'string') return data.description
				if (data.description?.value) return data.description.value
				// Try first_sentence as fallback
				if (data.first_sentence?.value) return data.first_sentence.value
				return null
			}
			case 'games': {
				const token = await getIgdbToken()
				const res = await fetch('https://api.igdb.com/v4/games', {
					method: 'POST',
					headers: {
						'Client-ID': process.env.TWITCH_CLIENT_ID!,
						Authorization: `Bearer ${token}`,
						Accept: 'application/json'
					},
					body: `fields summary; where id = ${sourceId};`
				})
				if (!res.ok) return null
				const games = await res.json()
				return games[0]?.summary || null
			}
			case 'manga': {
				const res = await fetch(ANILIST_URL, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						query: `query ($id: Int!) { Media(id: $id, type: MANGA) { description(asHtml: false) } }`,
						variables: { id: parseInt(sourceId) }
					})
				})
				if (!res.ok) return null
				const data = await res.json()
				return data.data?.Media?.description || null
			}
			case 'movies': {
				const res = await fetch(`${TMDB_BASE}/movie/${sourceId}`, {
					headers: {
						Authorization: `Bearer ${process.env.TMDB_API_TOKEN}`,
						Accept: 'application/json'
					}
				})
				if (!res.ok) return null
				const data = await res.json()
				return data.overview || null
			}
			case 'tv-shows': {
				const token = await getTvdbToken()
				const res = await fetch(`${TVDB_BASE}/series/${sourceId}`, {
					headers: {
						Authorization: `Bearer ${token}`,
						Accept: 'application/json'
					}
				})
				if (!res.ok) return null
				const data = await res.json()
				return data.data?.overview || null
			}
			default:
				return null
		}
	} catch (error) {
		logger.error(`Failed to fetch summary for ${category}/${sourceId}`, error as Error)
		return null
	}
}

// POST /api/admin/garden/backfill-summaries
export const POST: RequestHandler = async (event) => {
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	const items = await prisma.gardenItem.findMany({
		where: {
			sourceId: { not: null },
			summary: null,
			category: { notIn: ['music', 'other', 'devices'] }
		}
	})

	const results: { id: number; title: string; status: string }[] = []

	for (const item of items) {
		if (!item.sourceId) continue

		const summary = await fetchSummary(item.category, item.sourceId)
		if (summary) {
			await prisma.gardenItem.update({
				where: { id: item.id },
				data: { summary }
			})
			results.push({ id: item.id, title: item.title, status: 'updated' })
			logger.info(`Backfilled summary for "${item.title}"`)
		} else {
			results.push({ id: item.id, title: item.title, status: 'no_summary' })
		}
	}

	return jsonResponse({
		total: items.length,
		updated: results.filter((r) => r.status === 'updated').length,
		results
	})
}
