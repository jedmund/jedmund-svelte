import redis from '../../../../redis-client'
import { searchAlbums } from '$lib/server/apple-music-client'
import { getArtworkUrl } from '$lib/types/apple-music'

import type { RequestHandler } from './$types'
import { jsonResponse, errorResponse, checkAdminAuth } from '$lib/server/api-utils'

const CACHE_TTL = 60 * 60 // 1 hour

export const GET: RequestHandler = async (event) => {
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	const query = event.url.searchParams.get('q')?.trim()
	if (!query) {
		return errorResponse('Query parameter "q" is required')
	}

	const limit = Math.min(10, Math.max(1, parseInt(event.url.searchParams.get('limit') || '5')))

	const cacheKey = `apple-music:search:${query.toLowerCase()}`
	const cachedData = await redis.get(cacheKey)
	if (cachedData) {
		return jsonResponse({ results: JSON.parse(cachedData) })
	}

	try {
		const response = await searchAlbums(query, limit)
		const albums = response.results?.albums?.data || []

		const results = albums.map((album) => ({
			id: album.id,
			name: album.attributes.name,
			artist: album.attributes.artistName,
			image: album.attributes.artwork ? getArtworkUrl(album.attributes.artwork, 600) : null
		}))

		await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(results))
		return jsonResponse({ results })
	} catch (error) {
		console.error('Apple Music search error:', error)
		return errorResponse('Failed to search music', 500)
	}
}
