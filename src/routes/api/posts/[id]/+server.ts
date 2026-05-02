import type { RequestHandler } from './$types'
import type { Prisma } from '@prisma/client'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse, checkAdminAuth } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'
import { syndicateContent } from '$lib/server/syndication/syndicate'
import {
	removeMediaUsage,
	extractMediaIds,
	trackMediaUsage,
	type MediaUsageReference
} from '$lib/server/media-usage.js'
import { enrichUrlEmbeds } from '$lib/server/enrich-url-embeds'

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
			where: { id },
			include: {
				tags: {
					select: {
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

		if (!post) {
			return errorResponse('Post not found', 404)
		}

		logger.debug('Post retrieved', { id })
		return jsonResponse(post)
	} catch (error) {
		logger.error('Failed to retrieve post', error as Error)
		return errorResponse('Failed to retrieve post', 500)
	}
}

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

		const existing = await prisma.post.findUnique({
			where: { id },
			select: { updatedAt: true, status: true, publishedAt: true }
		})
		if (!existing) return errorResponse('Post not found', 404)

		if (data.updatedAt) {
			const incoming = new Date(data.updatedAt)
			if (existing.updatedAt.getTime() !== incoming.getTime()) {
				return errorResponse('Conflict: post has changed', 409)
			}
		}

		if (data.status === 'published' && existing.status !== 'published') {
			data.publishedAt = new Date()
		} else if (data.status === 'draft' && existing.status === 'published') {
			data.publishedAt = null
		}

		const featuredImageId = data.featuredImage

		let tagUpdate = {}
		if (data.tagIds !== undefined) {
			tagUpdate = {
				tags: {
					deleteMany: {},
					...(Array.isArray(data.tagIds) && data.tagIds.length > 0
						? {
								create: data.tagIds.map((tagId: number) => ({
									tag: { connect: { id: tagId } }
								}))
							}
						: {})
				}
			}
		}

		await enrichUrlEmbeds(data.content)

		const post = await prisma.$transaction(async (tx) => {
			const updated = await tx.post.update({
				where: { id },
				data: {
					title: data.title,
					slug: data.slug,
					postType: data.type,
					status: data.status,
					content: data.content,
					excerpt: data.excerpt ?? undefined,
					syndicationText: data.syndicationText ?? undefined,
					featuredImage: featuredImageId,
					syndicateBluesky: data.syndicateBluesky ?? undefined,
					syndicateMastodon: data.syndicateMastodon ?? undefined,
					appendLink: data.appendLink ?? undefined,
					attachments:
						data.attachedPhotos && data.attachedPhotos.length > 0 ? data.attachedPhotos : null,
					publishedAt: data.publishedAt,
					...tagUpdate
				}
			})

			await removeMediaUsage('post', id, undefined, tx)

			const usageReferences: MediaUsageReference[] = []
			const featuredImageIds = extractMediaIds(updated, 'featuredImage')
			featuredImageIds.forEach((mediaId) => {
				usageReferences.push({
					mediaId,
					contentType: 'post',
					contentId: id,
					fieldName: 'featuredImage'
				})
			})

			const attachmentIds = extractMediaIds(updated, 'attachments')
			attachmentIds.forEach((mediaId) => {
				usageReferences.push({
					mediaId,
					contentType: 'post',
					contentId: id,
					fieldName: 'attachments'
				})
			})

			const contentIds = extractMediaIds(updated, 'content')
			contentIds.forEach((mediaId) => {
				usageReferences.push({
					mediaId,
					contentType: 'post',
					contentId: id,
					fieldName: 'content'
				})
			})

			await trackMediaUsage(usageReferences, tx)

			return updated
		})

		logger.info('Post updated', { id })

		if (post.status === 'published') {
			syndicateContent('post', post.id).catch((err) =>
				logger.error('Auto-syndication failed', err as Error)
			)
		}

		return jsonResponse(post)
	} catch (error) {
		logger.error('Failed to update post', error as Error)
		return errorResponse('Failed to update post', 500)
	}
}

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
			if (data.status === 'published' && existing.status !== 'published') {
				updateData.publishedAt = new Date()
			} else if (data.status === 'draft' && existing.status === 'published') {
				updateData.publishedAt = null
			}
		}
		if (data.title !== undefined) updateData.title = data.title
		if (data.slug !== undefined) updateData.slug = data.slug
		if (data.type !== undefined) updateData.postType = data.type
		if (data.content !== undefined) {
			await enrichUrlEmbeds(data.content)
			updateData.content = data.content
		}
		if (data.featuredImage !== undefined) updateData.featuredImage = data.featuredImage
		if (data.attachedPhotos !== undefined)
			updateData.attachments =
				data.attachedPhotos && data.attachedPhotos.length > 0 ? data.attachedPhotos : null
		if (data.tags !== undefined) updateData.tags = data.tags
		if (data.excerpt !== undefined) updateData.excerpt = data.excerpt
		if (data.syndicationText !== undefined) updateData.syndicationText = data.syndicationText
		if (data.syndicateBluesky !== undefined) updateData.syndicateBluesky = data.syndicateBluesky
		if (data.syndicateMastodon !== undefined) updateData.syndicateMastodon = data.syndicateMastodon
		if (data.appendLink !== undefined) updateData.appendLink = data.appendLink

		const post = await prisma.post.update({ where: { id }, data: updateData })

		logger.info('Post partially updated', {
			id: post.id,
			fields: Object.keys(updateData).join(', ')
		})

		if (data.status === 'published' && existing.status !== 'published') {
			syndicateContent('post', post.id).catch((err) =>
				logger.error('Auto-syndication failed', err as Error)
			)
		}

		return jsonResponse(post)
	} catch (error) {
		logger.error('Failed to partially update post', error as Error)
		return errorResponse('Failed to update post', 500)
	}
}

export const DELETE: RequestHandler = async (event) => {
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	try {
		const id = parseInt(event.params.id)
		if (isNaN(id)) {
			return errorResponse('Invalid post ID', 400)
		}

		await prisma.$transaction(async (tx) => {
			await removeMediaUsage('post', id, undefined, tx)
			await tx.post.delete({ where: { id } })
		})

		logger.info('Post deleted', { id })
		return jsonResponse({ success: true })
	} catch (error) {
		logger.error('Failed to delete post', error as Error)
		return errorResponse('Failed to delete post', 500)
	}
}
