import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import {
	jsonResponse,
	errorResponse,
	getPaginationParams,
	getPaginationMeta,
	checkAdminAuth
} from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'

// GET /api/posts - List all posts
export const GET: RequestHandler = async (event) => {
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	try {
		const { page, limit } = getPaginationParams(event.url)
		const skip = (page - 1) * limit

		// Get filter parameters
		const status = event.url.searchParams.get('status')
		const postType = event.url.searchParams.get('postType')

		// Build where clause
		const where: any = {}
		if (status) {
			where.status = status
		}
		if (postType) {
			where.postType = postType
		}

		// Get total count
		const total = await prisma.post.count({ where })

		// Get posts
		const posts = await prisma.post.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			skip,
			take: limit
		})

		const pagination = getPaginationMeta(total, page, limit)

		logger.info('Posts list retrieved', { total, page, limit })

		return jsonResponse({
			posts,
			pagination
		})
	} catch (error) {
		logger.error('Failed to retrieve posts', error as Error)
		return errorResponse('Failed to retrieve posts', 500)
	}
}

// POST /api/posts - Create a new post
export const POST: RequestHandler = async (event) => {
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	try {
		const data = await event.request.json()

		// Set publishedAt if status is published
		if (data.status === 'published') {
			data.publishedAt = new Date()
		}

		const post = await prisma.post.create({
			data: {
				title: data.title,
				slug: data.slug,
				postType: data.type,
				status: data.status,
				content: data.content,
				excerpt: data.excerpt,
				linkUrl: data.link_url,
				tags: data.tags,
				publishedAt: data.publishedAt
			}
		})

		logger.info('Post created', { id: post.id, title: post.title })
		return jsonResponse(post)
	} catch (error) {
		logger.error('Failed to create post', error as Error)
		return errorResponse('Failed to create post', 500)
	}
}
