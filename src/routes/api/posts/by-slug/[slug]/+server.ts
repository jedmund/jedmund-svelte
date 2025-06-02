import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'

// GET /api/posts/by-slug/[slug] - Get post by slug
export const GET: RequestHandler = async (event) => {
	const slug = event.params.slug

	if (!slug) {
		return errorResponse('Invalid post slug', 400)
	}

	try {
		const post = await prisma.post.findUnique({
			where: { slug },
			include: {
				album: {
					select: {
						id: true,
						slug: true,
						title: true,
						description: true,
						photos: {
							orderBy: { displayOrder: 'asc' },
							select: {
								id: true,
								url: true,
								thumbnailUrl: true,
								caption: true,
								width: true,
								height: true
							}
						}
					}
				},
				photo: {
					select: {
						id: true,
						url: true,
						thumbnailUrl: true,
						caption: true,
						width: true,
						height: true
					}
				}
			}
		})

		if (!post) {
			return errorResponse('Post not found', 404)
		}

		// Only return published posts
		if (post.status !== 'published' || !post.publishedAt) {
			return errorResponse('Post not found', 404)
		}

		return jsonResponse(post)
	} catch (error) {
		logger.error('Failed to retrieve post by slug', error as Error)
		return errorResponse('Failed to retrieve post', 500)
	}
}
