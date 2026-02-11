import type { RequestHandler } from './$types'
import type { Prisma } from '@prisma/client'
import { prisma } from '$lib/server/database'
import {
	jsonResponse,
	errorResponse,
	getPaginationParams,
	getPaginationMeta,
	checkAdminAuth
} from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'
import { syndicateContent } from '$lib/server/syndication/syndicate'
import {
	trackMediaUsage,
	extractMediaIds,
	type MediaUsageReference
} from '$lib/server/media-usage.js'

export const GET: RequestHandler = async (event) => {
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	try {
		const { page, limit } = getPaginationParams(event.url)
		const skip = (page - 1) * limit

		const status = event.url.searchParams.get('status')
		const postType = event.url.searchParams.get('postType')
		const tagsParam = event.url.searchParams.get('tags')

		const where: Prisma.PostWhereInput = {}
		if (status) {
			where.status = status
		}
		if (postType) {
			where.postType = postType
		}

		if (tagsParam) {
			const tagSlugs = tagsParam.split(',').map(t => t.trim()).filter(Boolean)
			if (tagSlugs.length > 0) {
				where.tags = {
					some: {
						tag: {
							slug: { in: tagSlugs }
						}
					}
				}
			}
		}

		const total = await prisma.post.count({ where })
		const posts = await prisma.post.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			skip,
			take: limit,
			include: {
				tags: {
					include: {
						tag: {
							select: {
								id: true,
								name: true,
								displayName: true,
								slug: true
							}
						}
					}
				}
			}
		})

		const formattedPosts = posts.map(post => ({
			...post,
			tags: post.tags.map(pt => pt.tag)
		}))

		const pagination = getPaginationMeta(total, page, limit)

		logger.debug('Posts list retrieved', { total, page, limit })

		return jsonResponse({
			posts: formattedPosts,
			pagination
		})
	} catch (error) {
		logger.error('Failed to retrieve posts', error as Error)
		return errorResponse('Failed to retrieve posts', 500)
	}
}

export const POST: RequestHandler = async (event) => {
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	try {
		const data = await event.request.json()

		if (!data.slug) {
			if (data.title) {
				data.slug = data.title
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, '-')
					.replace(/^-+|-+$/g, '')
			} else {
				data.slug = `post-${Date.now()}`
			}
		}

		if (data.status === 'published') {
			data.publishedAt = new Date()
		}

		let featuredImageId = data.featuredImage
		if (data.attachedPhotos && data.attachedPhotos.length > 0 && !featuredImageId) {
			featuredImageId = data.attachedPhotos[0]
		}

		const post = await prisma.post.create({
			data: {
				title: data.title,
				slug: data.slug,
				postType: data.type,
				status: data.status,
				content: data.content,
				excerpt: data.excerpt || null,
				syndicationText: data.syndicationText || null,
				featuredImage: featuredImageId,
				attachments:
					data.attachedPhotos && data.attachedPhotos.length > 0 ? data.attachedPhotos : null,
				publishedAt: data.publishedAt,
				tags: data.tagIds && Array.isArray(data.tagIds) && data.tagIds.length > 0
					? {
							create: data.tagIds.map((tagId: number) => ({
								tag: { connect: { id: tagId } }
							}))
						}
					: undefined
			}
		})

		try {
			const usageReferences: MediaUsageReference[] = []

			const featuredImageIds = extractMediaIds({ featuredImage: featuredImageId }, 'featuredImage')
			featuredImageIds.forEach((mediaId) => {
				usageReferences.push({
					mediaId,
					contentType: 'post',
					contentId: post.id,
					fieldName: 'featuredImage'
				})
			})

			if (data.attachedPhotos && Array.isArray(data.attachedPhotos)) {
				data.attachedPhotos.forEach((mediaId: number) => {
					usageReferences.push({
						mediaId,
						contentType: 'post',
						contentId: post.id,
						fieldName: 'attachments'
					})
				})
			}

			if (data.gallery && Array.isArray(data.gallery)) {
				data.gallery.forEach((mediaId: number) => {
					usageReferences.push({
						mediaId,
						contentType: 'post',
						contentId: post.id,
						fieldName: 'gallery'
					})
				})
			}

			const contentIds = extractMediaIds({ content: data.content }, 'content')
			contentIds.forEach((mediaId) => {
				usageReferences.push({
					mediaId,
					contentType: 'post',
					contentId: post.id,
					fieldName: 'content'
				})
			})

			if (usageReferences.length > 0) {
				await trackMediaUsage(usageReferences)
			}
		} catch (error) {
			logger.warn('Failed to track media usage for post', { postId: post.id })
		}

		logger.info('Post created', { id: post.id, title: post.title })

		if (post.status === 'published') {
			syndicateContent('post', post.id)
				.catch(err => logger.error('Auto-syndication failed', err as Error))
		}

		return jsonResponse(post, 201)
	} catch (error) {
		logger.error('Failed to create post', error as Error)
		return errorResponse('Failed to create post', 500)
	}
}
