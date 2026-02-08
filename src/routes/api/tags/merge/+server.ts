import type { RequestHandler } from './$types'
import { json } from '@sveltejs/kit'
import { prisma } from '$lib/server/database'
import { redis } from '../../redis-client'
import { checkAdminAuth, errorResponse } from '$lib/server/api-utils'
import { mergeTagsSchema } from '$lib/server/tags/schemas'

/**
 * POST /api/tags/merge
 * Merge multiple tags into a single target tag
 *
 * All posts using source tags will be updated to use the target tag.
 * Source tags will be deleted.
 * Requires admin authentication.
 */
export const POST: RequestHandler = async (event) => {
	// Check admin auth
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	try {
		const body = await event.request.json()

		// Validate input
		const result = mergeTagsSchema.safeParse(body)
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

		const { sourceTagIds, targetTagId } = result.data

		// Check that source tags don't include target tag
		if (sourceTagIds.includes(targetTagId)) {
			return json(
				{
					error: {
						code: 'INVALID_INPUT',
						message: 'Cannot merge a tag into itself'
					}
				},
				{ status: 400 }
			)
		}

		// Perform merge in transaction
		await prisma.$transaction(async (tx) => {
			// 1. Update all post_tags pointing to sources → point to target
			await tx.postTag.updateMany({
				where: { tagId: { in: sourceTagIds } },
				data: { tagId: targetTagId }
			})

			// 2. Remove duplicates (same post, same tag after merge)
			await tx.$executeRaw`
        DELETE FROM post_tags a
        USING post_tags b
        WHERE a.id > b.id
        AND a.post_id = b.post_id
        AND a.tag_id = b.tag_id
      `

			// 3. Delete source tags (cascades will clean up remaining relationships)
			await tx.tag.deleteMany({
				where: { id: { in: sourceTagIds } }
			})
		})

		// Invalidate all caches
		await redis.flushdb()

		return json({ success: true })
	} catch (error) {
		console.error('Error merging tags:', error)
		return json(
			{
				error: {
					code: 'MERGE_FAILED',
					message: 'Failed to merge tags',
					details: error instanceof Error ? error.message : 'Unknown error'
				}
			},
			{ status: 500 }
		)
	}
}
