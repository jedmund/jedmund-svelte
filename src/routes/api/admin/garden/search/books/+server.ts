import redis from '../../../../redis-client'

import type { RequestHandler } from './$types'
import { jsonResponse, errorResponse, checkAdminAuth } from '$lib/server/api-utils'

const CACHE_TTL = 60 * 60 // 1 hour
const OPENLIBRARY_BASE = 'https://openlibrary.org'

async function resolveCoverUrl(coverId: number): Promise<string | null> {
	const url = `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
	try {
		const res = await fetch(url, { method: 'HEAD', redirect: 'follow' })
		if (res.ok) return res.url
		return null
	} catch {
		return url
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

	const cacheKey = `openlibrary:search:${query.toLowerCase()}`
	const cachedData = await redis.get(cacheKey)
	if (cachedData) {
		return jsonResponse({ results: JSON.parse(cachedData) })
	}

	try {
		const res = await fetch(
			`${OPENLIBRARY_BASE}/search.json?q=${encodeURIComponent(query)}&limit=${limit}`
		)

		if (!res.ok) {
			const text = await res.text()
			console.error('Open Library API error:', res.status, text)
			return errorResponse('Failed to search books', 500)
		}

		const data = await res.json()
		const docs = data.docs || []

		const results = await Promise.all(
			docs.map(
				async (doc: {
					key: string
					title: string
					author_name?: string[]
					cover_i?: number
					first_publish_year?: number
					first_sentence?: string[]
				}) => ({
					id: doc.key,
					name: doc.title,
					author: doc.author_name?.[0] || null,
					image: doc.cover_i ? await resolveCoverUrl(doc.cover_i) : null,
					year: doc.first_publish_year?.toString() || null,
					sourceId: doc.key,
					summary: doc.first_sentence?.[0] || null
				})
			)
		)

		await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(results))
		return jsonResponse({ results })
	} catch (error) {
		console.error('Open Library search error:', error)
		return errorResponse('Failed to search books', 500)
	}
}
