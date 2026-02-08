import type { RequestHandler } from './$types'
import { json } from '@sveltejs/kit'
import { redis } from '../../redis-client'
import { errorResponse } from '$lib/server/api-utils'
import { suggestTags } from '$lib/server/tags/operations'

/**
 * GET /api/tags/suggest
 * Get tag suggestions for typeahead
 *
 * Query params:
 * - q: string (required, min 2 chars)
 * - limit: number (default: 5)
 */
export const GET: RequestHandler = async ({ url }) => {
	const query = url.searchParams.get('q')
	const limit = parseInt(url.searchParams.get('limit') ?? '5')

	if (!query || query.length < 2) {
		return json({ suggestions: [] })
	}

	try {
		// Cache suggestions for 2 minutes
		const cacheKey = `tags:suggest:${query}:${limit}`
		const cached = await redis.get(cacheKey)

		if (cached) {
			return json(JSON.parse(cached))
		}

		const suggestions = await suggestTags(query, limit)
		const response = { suggestions }

		await redis.setex(cacheKey, 120, JSON.stringify(response))

		return json(response)
	} catch (error) {
		console.error('Error fetching tag suggestions:', error)
		return errorResponse('Failed to fetch suggestions', 500)
	}
}
