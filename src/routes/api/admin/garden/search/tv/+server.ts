import redis from '../../../../redis-client'

import type { RequestHandler } from './$types'
import { jsonResponse, errorResponse, checkAdminAuth } from '$lib/server/api-utils'

const CACHE_TTL = 60 * 60 // 1 hour
const TVDB_BASE = 'https://api4.thetvdb.com/v4'
const TOKEN_CACHE_KEY = 'tvdb:access_token'

async function getTvdbToken(): Promise<string> {
	const cached = await redis.get(TOKEN_CACHE_KEY)
	if (cached) return cached

	const res = await fetch(`${TVDB_BASE}/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ apikey: process.env.TVDB_API_KEY })
	})

	if (!res.ok) {
		throw new Error(`TVDB auth failed: ${res.status}`)
	}

	const data = await res.json()
	const token = data.data.token
	// Token lasts ~1 month, cache for 28 days
	await redis.setex(TOKEN_CACHE_KEY, 60 * 60 * 24 * 28, token)
	return token
}

async function getSeriesDetails(
	tvdbId: string,
	token: string
): Promise<{ seasons: number | null; episodes: number | null }> {
	try {
		const res = await fetch(`${TVDB_BASE}/series/${tvdbId}/extended`, {
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: 'application/json'
			}
		})
		if (!res.ok) return { seasons: null, episodes: null }
		const data = await res.json()
		const series = data.data
		// Filter out specials (season 0)
		const regularSeasons = series?.seasons?.filter(
			(s: { number: number }) => s.number > 0
		)
		return {
			seasons: regularSeasons?.length ?? null,
			episodes: series?.episodes?.length ?? null
		}
	} catch {
		return { seasons: null, episodes: null }
	}
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

	const cacheKey = `tvdb:search:${query.toLowerCase()}`
	const cachedData = await redis.get(cacheKey)
	if (cachedData) {
		return jsonResponse({ results: JSON.parse(cachedData) })
	}

	try {
		const token = await getTvdbToken()
		const headers = {
			Authorization: `Bearer ${token}`,
			Accept: 'application/json'
		}

		const res = await fetch(
			`${TVDB_BASE}/search?query=${encodeURIComponent(query)}&type=series&limit=${limit}`,
			{ headers }
		)

		if (!res.ok) {
			const text = await res.text()
			console.error('TVDB API error:', res.status, text)
			return errorResponse('Failed to search TV shows', 500)
		}

		const data = await res.json()
		const shows = (data.data || []).slice(0, limit)

		const results = await Promise.all(
			shows.map(
				async (show: {
					tvdb_id: string
					name: string
					overview?: string
					image_url?: string
					year?: string
					primary_language?: string
					translations?: Record<string, string>
				}) => {
					const engName = show.translations?.eng
					const jpnName = show.translations?.jpn
					const displayName =
						show.primary_language !== 'eng' && engName ? engName : show.name
					const originalName =
						displayName !== show.name
							? show.name
							: show.primary_language === 'eng' && jpnName && jpnName !== show.name
								? jpnName
								: null

					const details = await getSeriesDetails(show.tvdb_id, token)

					return {
						id: show.tvdb_id,
						name: displayName,
						originalName,
						image: show.image_url || null,
						year: show.year || null,
						sourceId: show.tvdb_id,
						metadata: { seasons: details.seasons, episodes: details.episodes },
						summary: show.overview || null
					}
				}
			)
		)

		await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(results))
		return jsonResponse({ results })
	} catch (error) {
		console.error('TVDB search error:', error)
		return errorResponse('Failed to search TV shows', 500)
	}
}
