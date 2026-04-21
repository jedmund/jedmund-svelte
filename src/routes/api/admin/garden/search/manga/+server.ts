import redis from '../../../../redis-client'

import type { RequestHandler } from './$types'
import { jsonResponse, errorResponse } from '$lib/server/api-utils'

const CACHE_TTL = 60 * 60 // 1 hour
const ANILIST_URL = 'https://graphql.anilist.co'

const SEARCH_QUERY = `
	query ($search: String!, $perPage: Int!) {
		Page(perPage: $perPage) {
			media(search: $search, type: MANGA, sort: POPULARITY_DESC) {
				id
				title { romaji english native }
				description(asHtml: false)
				coverImage { large }
				chapters
				volumes
				startDate { year }
				staff(sort: RELEVANCE, perPage: 5) {
					edges {
						role
						node { name { full } }
					}
				}
			}
		}
	}
`

const AUTHOR_ROLES = ['Story & Art', 'Story', 'Original Creator', 'Art']

function findAuthor(edges: { role: string; node: { name: { full: string } } }[]): string | null {
	for (const prefix of AUTHOR_ROLES) {
		const match = edges.find((e) => e.role === prefix || e.role.startsWith(`${prefix} (`))
		if (match) return match.node.name.full
	}
	return null
}

export const GET: RequestHandler = async (event) => {
	const query = event.url.searchParams.get('q')?.trim()
	if (!query) {
		return errorResponse('Query parameter "q" is required')
	}

	const limit = Math.min(10, Math.max(1, parseInt(event.url.searchParams.get('limit') || '5')))

	const cacheKey = `anilist:search:${query.toLowerCase()}`
	const cachedData = await redis.get(cacheKey)
	if (cachedData) {
		return jsonResponse({ results: JSON.parse(cachedData) })
	}

	try {
		const res = await fetch(ANILIST_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: SEARCH_QUERY,
				variables: { search: query, perPage: limit }
			})
		})

		if (!res.ok) {
			const text = await res.text()
			console.error('AniList API error:', res.status, text)
			return errorResponse('Failed to search manga', 500)
		}

		const data = await res.json()
		const media = data.data?.Page?.media || []

		const results = media.map(
			(m: {
				id: number
				title: { romaji: string; english: string | null; native: string | null }
				description: string | null
				coverImage: { large: string | null }
				chapters: number | null
				volumes: number | null
				startDate: { year: number | null } | null
				staff: { edges: { role: string; node: { name: { full: string } } }[] }
			}) => ({
				id: m.id,
				name: m.title.english || m.title.romaji,
				author: findAuthor(m.staff?.edges || []),
				image: m.coverImage?.large || null,
				year: m.startDate?.year?.toString() || null,
				sourceId: String(m.id),
				metadata: { chapters: m.chapters ?? null, volumes: m.volumes ?? null },
				summary: m.description || null
			})
		)

		await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(results))
		return jsonResponse({ results })
	} catch (error) {
		console.error('AniList search error:', error)
		return errorResponse('Failed to search manga', 500)
	}
}
