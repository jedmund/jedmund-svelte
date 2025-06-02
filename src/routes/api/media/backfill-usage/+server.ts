import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse, checkAdminAuth } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'
import { trackMediaUsage, extractMediaIds, removeMediaUsage, type MediaUsageReference } from '$lib/server/media-usage.js'

// POST /api/media/backfill-usage - Backfill media usage tracking for all content
export const POST: RequestHandler = async (event) => {
	// Check authentication
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	try {
		let totalTracked = 0
		const usageReferences: MediaUsageReference[] = []

		// Clear all existing usage tracking
		await prisma.mediaUsage.deleteMany({})

		// Backfill projects
		const projects = await prisma.project.findMany({
			select: {
				id: true,
				featuredImage: true,
				logoUrl: true,
				gallery: true,
				caseStudyContent: true
			}
		})

		for (const project of projects) {
			// Track featured image
			const featuredImageIds = extractMediaIds(project, 'featuredImage')
			featuredImageIds.forEach(mediaId => {
				usageReferences.push({
					mediaId,
					contentType: 'project',
					contentId: project.id,
					fieldName: 'featuredImage'
				})
			})

			// Track logo
			const logoIds = extractMediaIds(project, 'logoUrl')
			logoIds.forEach(mediaId => {
				usageReferences.push({
					mediaId,
					contentType: 'project',
					contentId: project.id,
					fieldName: 'logoUrl'
				})
			})

			// Track gallery images
			const galleryIds = extractMediaIds(project, 'gallery')
			galleryIds.forEach(mediaId => {
				usageReferences.push({
					mediaId,
					contentType: 'project',
					contentId: project.id,
					fieldName: 'gallery'
				})
			})

			// Track media in case study content
			const contentIds = extractMediaIds(project, 'caseStudyContent')
			contentIds.forEach(mediaId => {
				usageReferences.push({
					mediaId,
					contentType: 'project',
					contentId: project.id,
					fieldName: 'content'
				})
			})
		}

		// Backfill posts
		const posts = await prisma.post.findMany({
			select: {
				id: true,
				featuredImage: true,
				content: true,
				attachments: true
			}
		})

		for (const post of posts) {
			// Track featured image
			const featuredImageIds = extractMediaIds(post, 'featuredImage')
			featuredImageIds.forEach(mediaId => {
				usageReferences.push({
					mediaId,
					contentType: 'post',
					contentId: post.id,
					fieldName: 'featuredImage'
				})
			})

			// Track attachments
			const attachmentIds = extractMediaIds(post, 'attachments')
			attachmentIds.forEach(mediaId => {
				usageReferences.push({
					mediaId,
					contentType: 'post',
					contentId: post.id,
					fieldName: 'attachments'
				})
			})

			// Track media in post content
			const contentIds = extractMediaIds(post, 'content')
			contentIds.forEach(mediaId => {
				usageReferences.push({
					mediaId,
					contentType: 'post',
					contentId: post.id,
					fieldName: 'content'
				})
			})
		}

		// Save all usage references
		if (usageReferences.length > 0) {
			await trackMediaUsage(usageReferences)
			totalTracked = usageReferences.length
		}

		logger.info('Media usage backfill completed', { totalTracked })

		return jsonResponse({
			success: true,
			message: 'Media usage tracking backfilled successfully',
			totalTracked,
			projectsProcessed: projects.length,
			postsProcessed: posts.length
		})
	} catch (error) {
		logger.error('Failed to backfill media usage', error as Error)
		return errorResponse('Failed to backfill media usage', 500)
	}
}