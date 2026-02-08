import type { RequestHandler } from './$types'
import { json } from '@sveltejs/kit'
import { redis } from '../../redis-client'
import { checkAdminAuth, errorResponse } from '$lib/server/api-utils'
import { updateTag, deleteTag, getTagById } from '$lib/server/tags/operations'
import { updateTagSchema } from '$lib/server/tags/schemas'

/**
 * GET /api/tags/[id]
 * Get a single tag by ID
 */
export const GET: RequestHandler = async ({ params }) => {
	const tagId = parseInt(params.id)

	if (isNaN(tagId)) {
		return errorResponse('Invalid tag ID', 400)
	}

	try {
		const tag = await getTagById(tagId)

		if (!tag) {
			return json(
				{
					error: {
						code: 'TAG_NOT_FOUND',
						message: 'Tag not found'
					}
				},
				{ status: 404 }
			)
		}

		return json({
			tag: {
				id: tag.id,
				name: tag.name,
				displayName: tag.displayName,
				slug: tag.slug,
				description: tag.description,
				usageCount: tag._count.posts,
				createdAt: tag.createdAt.toISOString(),
				updatedAt: tag.updatedAt.toISOString()
			}
		})
	} catch (error) {
		console.error('Error fetching tag:', error)
		return errorResponse('Failed to fetch tag', 500)
	}
}

/**
 * PUT /api/tags/[id]
 * Update an existing tag
 *
 * Requires admin authentication
 */
export const PUT: RequestHandler = async (event) => {
	// Check admin auth
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	const tagId = parseInt(event.params.id)

	if (isNaN(tagId)) {
		return errorResponse('Invalid tag ID', 400)
	}

	try {
		const body = await event.request.json()

		// Validate input
		const result = updateTagSchema.safeParse(body)
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

		// Update tag
		const tag = await updateTag(tagId, result.data)

		// Invalidate cache
		const keys = await redis.keys('tags:*')
		if (keys.length > 0) {
			await redis.del(...keys)
		}

		return json({ tag })
	} catch (error) {
		if (error instanceof Error) {
			// Tag not found
			if (error.message.includes('Record to update not found')) {
				return json(
					{
						error: {
							code: 'TAG_NOT_FOUND',
							message: 'Tag not found'
						}
					},
					{ status: 404 }
				)
			}

			// Duplicate name
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

			// Validation errors
			if (error.message.includes('reserved') || error.message.includes('invalid') || error.message.includes('long')) {
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
		}

		console.error('Error updating tag:', error)
		return errorResponse('Failed to update tag', 500)
	}
}

/**
 * DELETE /api/tags/[id]
 * Delete a tag and remove it from all posts (CASCADE)
 *
 * Requires admin authentication
 */
export const DELETE: RequestHandler = async (event) => {
	// Check admin auth
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	const tagId = parseInt(event.params.id)

	if (isNaN(tagId)) {
		return errorResponse('Invalid tag ID', 400)
	}

	try {
		await deleteTag(tagId)

		// Invalidate all caches (related posts depend on tags)
		await redis.flushdb()

		return new Response(null, { status: 204 })
	} catch (error) {
		if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
			return json(
				{
					error: {
						code: 'TAG_NOT_FOUND',
						message: 'Tag not found'
					}
				},
				{ status: 404 }
			)
		}

		console.error('Error deleting tag:', error)
		return errorResponse('Failed to delete tag', 500)
	}
}
