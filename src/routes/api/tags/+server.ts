import type { RequestHandler } from './$types'
import { json } from '@sveltejs/kit'
import { redis } from '../redis-client'
import { checkAdminAuth, errorResponse } from '$lib/server/api-utils'
import { createTag, listTags } from '$lib/server/tags/operations'
import { createTagSchema } from '$lib/server/tags/schemas'

/**
 * GET /api/tags
 * List all tags with pagination and search
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 50, max: 100)
 * - sort: 'name' | 'usage' | 'recent' (default: 'name')
 * - order: 'asc' | 'desc' (default: 'asc')
 * - search: string (optional)
 */
export const GET: RequestHandler = async ({ url }) => {
	const page = parseInt(url.searchParams.get('page') ?? '1')
	const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 100)
	const sort = (url.searchParams.get('sort') ?? 'name') as 'name' | 'usage' | 'recent'
	const order = (url.searchParams.get('order') ?? 'asc') as 'asc' | 'desc'
	const search = url.searchParams.get('search')

	try {
		// Try cache first
		const cacheKey = `tags:list:${page}:${limit}:${sort}:${order}:${search ?? ''}`
		const cached = await redis.get(cacheKey)

		if (cached) {
			return json(JSON.parse(cached))
		}

		// Fetch from database
		const result = await listTags({ page, limit, sort, order, search: search ?? undefined })

		// Cache for 5 minutes
		await redis.setex(cacheKey, 300, JSON.stringify(result))

		return json(result)
	} catch (error) {
		console.error('Error fetching tags:', error)
		return errorResponse('Failed to fetch tags', 500)
	}
}

/**
 * POST /api/tags
 * Create a new tag
 *
 * Requires admin authentication
 */
export const POST: RequestHandler = async (event) => {
	// Check admin auth
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	try {
		const body = await event.request.json()

		// Validate input
		const result = createTagSchema.safeParse(body)
		if (!result.success) {
			return json(
				{
					error: {
						code: 'VALIDATION_ERROR',
						message: 'Invalid input',
						details: result.error.format()
					}
				},
				{ status: 400 }
			)
		}

		// Create tag
		const tag = await createTag(result.data)

		// Invalidate cache
		const keys = await redis.keys('tags:list:*')
		if (keys.length > 0) {
			await redis.del(...keys)
		}

		return json({ tag }, { status: 201 })
	} catch (error) {
		// Check for specific errors
		if (error instanceof Error) {
			if (error.message.includes('already exists')) {
				return json(
					{
						error: {
							code: 'TAG_ALREADY_EXISTS',
							message: error.message,
							field: 'name'
						}
					},
					{ status: 409 }
				)
			}

			if (error.message.includes('reserved')) {
				return json(
					{
						error: {
							code: 'TAG_NAME_RESERVED',
							message: error.message,
							field: 'name'
						}
					},
					{ status: 400 }
				)
			}

			// Validation errors
			return json(
				{
					error: {
						code: 'TAG_NAME_INVALID',
						message: error.message,
						field: 'name'
					}
				},
				{ status: 400 }
			)
		}

		console.error('Error creating tag:', error)
		return errorResponse('Failed to create tag', 500)
	}
}
