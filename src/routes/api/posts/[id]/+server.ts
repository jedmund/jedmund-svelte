import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse, checkAdminAuth } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'

// GET /api/posts/[id] - Get a single post
export const GET: RequestHandler = async (event) => {
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	try {
		const id = parseInt(event.params.id)
		if (isNaN(id)) {
			return errorResponse('Invalid post ID', 400)
		}

		const post = await prisma.post.findUnique({
			where: { id }
		})

		if (!post) {
			return errorResponse('Post not found', 404)
		}

		logger.info('Post retrieved', { id })
		return jsonResponse(post)
	} catch (error) {
		logger.error('Failed to retrieve post', error as Error)
		return errorResponse('Failed to retrieve post', 500)
	}
}

// PUT /api/posts/[id] - Update a post
export const PUT: RequestHandler = async (event) => {
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	try {
		const id = parseInt(event.params.id)
		if (isNaN(id)) {
			return errorResponse('Invalid post ID', 400)
		}

		const data = await event.request.json()

		// Update publishedAt if status is changing to published
		if (data.status === 'published') {
			const currentPost = await prisma.post.findUnique({
				where: { id },
				select: { status: true, publishedAt: true }
			})

			if (currentPost && currentPost.status !== 'published' && !currentPost.publishedAt) {
				data.publishedAt = new Date()
			}
		}

		const post = await prisma.post.update({
			where: { id },
			data: {
				title: data.title,
				slug: data.slug,
				postType: data.type,
				status: data.status,
				content: data.content,
				excerpt: data.excerpt,
				linkUrl: data.link_url,
				tags: data.tags
			}
		})

		logger.info('Post updated', { id })
		return jsonResponse(post)
	} catch (error) {
		logger.error('Failed to update post', error as Error)
		return errorResponse('Failed to update post', 500)
	}
}

// DELETE /api/posts/[id] - Delete a post
export const DELETE: RequestHandler = async (event) => {
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	try {
		const id = parseInt(event.params.id)
		if (isNaN(id)) {
			return errorResponse('Invalid post ID', 400)
		}

		await prisma.post.delete({
			where: { id }
		})

		logger.info('Post deleted', { id })
		return jsonResponse({ message: 'Post deleted successfully' })
	} catch (error) {
		logger.error('Failed to delete post', error as Error)
		return errorResponse('Failed to delete post', 500)
	}
}
