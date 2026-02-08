import type { RequestHandler } from './$types'
import { json } from '@sveltejs/kit'
import { prisma } from '$lib/server/database'
import redis from '../../redis-client'
import { errorResponse } from '$lib/server/api-utils'

/**
 * GET /api/posts/related
 * Get related posts based on shared tags
 *
 * Query params:
 * - postId: number (required)
 * - tagIds: string (comma-separated tag IDs)
 * - limit: number (default: 3)
 */
export const GET: RequestHandler = async ({ url }) => {
	const postIdParam = url.searchParams.get('postId')
	const tagIdsParam = url.searchParams.get('tagIds')
	const limit = parseInt(url.searchParams.get('limit') ?? '3')

	if (!postIdParam) {
		return errorResponse('postId is required', 400)
	}

	const postId = parseInt(postIdParam)
	if (isNaN(postId)) {
		return errorResponse('Invalid postId', 400)
	}

	if (!tagIdsParam) {
		return json({ posts: [] })
	}

	const tagIds = tagIdsParam.split(',').map(id => parseInt(id)).filter(id => !isNaN(id))

	if (tagIds.length === 0) {
		return json({ posts: [] })
	}

	try {
		// Cache for 5 minutes
		const cacheKey = `related:${postId}:${tagIds.join('-')}:${limit}`
		const cached = await redis.get(cacheKey)

		if (cached) {
			return json(JSON.parse(cached))
		}

		// Efficient related posts query using raw SQL
		const relatedPosts = await prisma.$queryRaw<
			Array<{
				id: number
				title: string | null
				slug: string
				excerpt: string | null
				published_at: Date | null
				shared_count: bigint
			}>
		>`
			WITH shared_tags AS (
				SELECT
					pt2.post_id,
					COUNT(*) as shared_count
				FROM post_tags pt1
				JOIN post_tags pt2 ON pt1.tag_id = pt2.tag_id
				WHERE pt1.post_id = ${postId}
					AND pt2.post_id != ${postId}
				GROUP BY pt2.post_id
			)
			SELECT
				p.id,
				p.title,
				p.slug,
				CASE
					WHEN p.content IS NOT NULL
					THEN SUBSTRING(p.content::text, 1, 200)
					ELSE NULL
				END as excerpt,
				p.published_at,
				st.shared_count::int as shared_count
			FROM "Post" p
			JOIN shared_tags st ON p.id = st.post_id
			WHERE p.status = 'published'
			ORDER BY st.shared_count DESC, p.published_at DESC
			LIMIT ${limit}
		`

		// Fetch tags for each related post
		const postsWithTags = await Promise.all(
			relatedPosts.map(async post => {
				const tags = await prisma.tag.findMany({
					where: {
						posts: {
							some: { postId: post.id }
						}
					},
					select: {
						id: true,
						name: true,
						displayName: true,
						slug: true
					}
				})

				return {
					id: post.id,
					title: post.title,
					slug: post.slug,
					excerpt: post.excerpt,
					publishedAt: post.published_at?.toISOString() || null,
					tags,
					sharedTagsCount: Number(post.shared_count)
				}
			})
		)

		const response = { posts: postsWithTags }
		await redis.setex(cacheKey, 300, JSON.stringify(response))

		return json(response)
	} catch (error) {
		console.error('Error fetching related posts:', error)
		return errorResponse('Failed to fetch related posts', 500)
	}
}
