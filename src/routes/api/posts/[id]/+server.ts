import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse, checkAdminAuth } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'
import {
	updateMediaUsage,
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

		// Handle album gallery updates
		let featuredImageId = data.featuredImage
		if (data.gallery && data.gallery.length > 0 && !featuredImageId) {
			// Get the media URL for the first gallery item
			const firstMedia = await prisma.media.findUnique({
				where: { id: data.gallery[0] },
				select: { url: true }
			})
			if (firstMedia) {
				featuredImageId = firstMedia.url
			}
		}

		// For albums, store gallery IDs in content field as a special structure
		let postContent = data.content
		if (data.type === 'album' && data.gallery) {
			postContent = {
				type: 'album',
				gallery: data.gallery,
				description: data.content
			}
		}

		const post = await prisma.post.update({
			where: { id },
			data: {
				title: data.title,
				slug: data.slug,
				postType: data.type,
				status: data.status,
				content: postContent,
				linkUrl: data.link_url,
				linkDescription: data.linkDescription,
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
			logger.warn('Failed to update media usage for post', { postId: id, error })
		}

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
