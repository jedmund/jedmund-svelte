import redis from '../../../../redis-client'

import type { RequestHandler } from './$types'
import { jsonResponse, errorResponse, checkAdminAuth } from '$lib/server/api-utils'

const CACHE_TTL = 60 * 60 // 1 hour
const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'

function tmdbHeaders(): Record<string, string> {
	return {
		Authorization: `Bearer ${process.env.TMDB_API_TOKEN}`,
		Accept: 'application/json'
	}
}

async function getMovieDetails(
	movieId: number
): Promise<{ director: string | null; runtime: number | null }> {
	try {
		const res = await fetch(`${TMDB_BASE}/movie/${movieId}?append_to_response=credits`, {
			headers: tmdbHeaders()
		})
		if (!res.ok) return { director: null, runtime: null }
		const data = await res.json()
		const director = data.credits?.crew?.find(
			(p: { job: string; name: string }) => p.job === 'Director'
		)
		return {
			director: director?.name || null,
			runtime: data.runtime || null
		}
	} catch {
		return { director: null, runtime: null }
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

	const cacheKey = `tmdb:search:${query.toLowerCase()}`
	const cachedData = await redis.get(cacheKey)
	if (cachedData) {
		return jsonResponse({ results: JSON.parse(cachedData) })
	}

	try {
		const res = await fetch(`${TMDB_BASE}/search/movie?query=${encodeURIComponent(query)}&page=1`, {
			headers: tmdbHeaders()
		})

		if (!res.ok) {
			const text = await res.text()
			console.error('TMDB API error:', res.status, text)
			return errorResponse('Failed to search movies', 500)
		}

		const data = await res.json()
		const movies = (data.results || []).slice(0, limit)

		const results = await Promise.all(
			movies.map(
				async (movie: {
					id: number
					title: string
					overview?: string
					poster_path: string | null
					release_date?: string
				}) => {
					const details = await getMovieDetails(movie.id)
					return {
						id: movie.id,
						name: movie.title,
						image: movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : null,
						director: details.director,
						year: movie.release_date?.slice(0, 4) || null,
						sourceId: String(movie.id),
						metadata: { runtime: details.runtime },
						summary: movie.overview || null
					}
				}
			)
		)

		await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(results))
		return jsonResponse({ results })
	} catch (error) {
		console.error('TMDB search error:', error)
		return errorResponse('Failed to search movies', 500)
	}
}
