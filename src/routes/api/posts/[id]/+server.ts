import type { RequestHandler } from './$types'
import type { Prisma } from '@prisma/client'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse, checkAdminAuth } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'
import {
	removeMediaUsage,
	extractMediaIds,
	trackMediaUsage,
	type MediaUsageReference
} from '$lib/server/media-usage.js'

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

		// Concurrency control: require matching updatedAt if provided
		if (data.updatedAt) {
			const existing = await prisma.post.findUnique({ where: { id }, select: { updatedAt: true } })
			if (!existing) return errorResponse('Post not found', 404)
			const incoming = new Date(data.updatedAt)
			if (existing.updatedAt.getTime() !== incoming.getTime()) {
				return errorResponse('Conflict: post has changed', 409)
			}
		}

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

		// Use content as-is (no special handling needed)
		const featuredImageId = data.featuredImage
		const postContent = data.content

		const post = await prisma.post.update({
			where: { id },
			data: {
				title: data.title,
				slug: data.slug,
				postType: data.type,
				status: data.status,
				content: postContent,
				featuredImage: featuredImageId,
				attachments:
					data.attachedPhotos && data.attachedPhotos.length > 0 ? data.attachedPhotos : null,
				tags: data.tags,
				publishedAt: data.publishedAt
			}
		})

		// Update media usage tracking
		try {
			// Remove all existing usage for this post first
			await removeMediaUsage('post', id)

			// Track all current media usage in the updated post
			const usageReferences: MediaUsageReference[] = []

			// Track featured image
			const featuredImageIds = extractMediaIds(post, 'featuredImage')
			featuredImageIds.forEach((mediaId) => {
				usageReferences.push({
					mediaId,
					contentType: 'post',
					contentId: id,
					fieldName: 'featuredImage'
				})
			})

			// Track attachments
			const attachmentIds = extractMediaIds(post, 'attachments')
			attachmentIds.forEach((mediaId) => {
				usageReferences.push({
					mediaId,
					contentType: 'post',
					contentId: id,
					fieldName: 'attachments'
				})
			})

			// Track media in post content
			const contentIds = extractMediaIds(post, 'content')
			contentIds.forEach((mediaId) => {
				usageReferences.push({
					mediaId,
					contentType: 'post',
					contentId: id,
					fieldName: 'content'
				})
			})

			// Add new usage references
			if (usageReferences.length > 0) {
				await trackMediaUsage(usageReferences)
			}
		} catch (error) {
			logger.warn('Failed to update media usage for post', { postId: id })
		}

		logger.info('Post updated', { id })
		return jsonResponse(post)
	} catch (error) {
		logger.error('Failed to update post', error as Error)
		return errorResponse('Failed to update post', 500)
	}
}

// PATCH /api/posts/[id] - Partially update a post
export const PATCH: RequestHandler = async (event) => {
  if (!checkAdminAuth(event)) {
    return errorResponse('Unauthorized', 401)
  }

  try {
    const id = parseInt(event.params.id)
    if (isNaN(id)) {
      return errorResponse('Invalid post ID', 400)
    }

    const data = await event.request.json()

    // Check for existence and concurrency
    const existing = await prisma.post.findUnique({ where: { id } })
    if (!existing) return errorResponse('Post not found', 404)
    if (data.updatedAt) {
      const incoming = new Date(data.updatedAt)
      if (existing.updatedAt.getTime() !== incoming.getTime()) {
        return errorResponse('Conflict: post has changed', 409)
      }
    }

    const updateData: Prisma.PostUpdateInput = {}

    if (data.status !== undefined) {
      updateData.status = data.status
      if (data.status === 'published' && !existing.publishedAt) {
        updateData.publishedAt = new Date()
      } else if (data.status === 'draft') {
        updateData.publishedAt = null
      }
    }
    if (data.title !== undefined) updateData.title = data.title
    if (data.slug !== undefined) updateData.slug = data.slug
    if (data.type !== undefined) updateData.postType = data.type
    if (data.content !== undefined) updateData.content = data.content
    if (data.featuredImage !== undefined) updateData.featuredImage = data.featuredImage
    if (data.attachedPhotos !== undefined)
      updateData.attachments = data.attachedPhotos && data.attachedPhotos.length > 0 ? data.attachedPhotos : null
    if (data.tags !== undefined) updateData.tags = data.tags
    if (data.publishedAt !== undefined) updateData.publishedAt = data.publishedAt

    const post = await prisma.post.update({ where: { id }, data: updateData })

    logger.info('Post partially updated', { id: post.id, fields: Object.keys(updateData).join(', ') })
    return jsonResponse(post)
  } catch (error) {
    logger.error('Failed to partially update post', error as Error)
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

		// Remove media usage tracking first
		await removeMediaUsage('post', id)

		// Delete the post
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
