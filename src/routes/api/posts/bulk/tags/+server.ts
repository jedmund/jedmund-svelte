import type { RequestHandler} from './$types'
import { json } from '@sveltejs/kit'
import { prisma } from '$lib/server/database'
import { redis } from '../../../redis-client'
import { checkAdminAuth, errorResponse } from '$lib/server/api-utils'
import { bulkTagSchema } from '$lib/server/tags/schemas'

/**
 * POST /api/posts/bulk/tags
 * Add or remove tags from multiple posts at once
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
		const result = bulkTagSchema.safeParse(body)
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

		const { postIds, tagIds, operation } = result.data

		// Perform bulk operation in transaction
		await prisma.$transaction(async (tx) => {
			if (operation === 'add') {
				// Add tags to posts (upsert to avoid duplicates)
				for (const postId of postIds) {
					for (const tagId of tagIds) {
						await tx.postTag.upsert({
							where: {
								postId_tagId: { postId, tagId }
							},
							create: { postId, tagId },
							update: {}
						})
					}
				}
			} else {
				// Remove tags from posts
				await tx.postTag.deleteMany({
					where: {
						postId: { in: postIds },
						tagId: { in: tagIds }
					}
				})
			}
		})

		// Invalidate related posts cache
		const keys = await redis.keys('related:*')
		if (keys.length > 0) {
			await redis.del(...keys)
		}

		return json({
			success: true,
			affected: {
				posts: postIds.length,
				tags: tagIds.length
			}
		})
	} catch (error) {
		console.error('Error performing bulk tag operation:', error)
		return json(
			{
				error: {
					code: 'BULK_OPERATION_FAILED',
					message: 'Failed to update tags',
					details: error instanceof Error ? error.message : 'Unknown error'
				}
			},
			{ status: 500 }
		)
	}
}
