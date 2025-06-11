import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import {
	jsonResponse,
	errorResponse,
	checkAdminAuth,
	parseRequestBody
} from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'
import { removeMediaUsage, extractMediaIds } from '$lib/server/media-usage.js'
import { deleteFile, extractPublicId, isCloudinaryConfigured } from '$lib/server/cloudinary'
import { deleteFileLocally } from '$lib/server/local-storage'

// DELETE /api/media/bulk-delete - Delete multiple media files and clean up references
export const DELETE: RequestHandler = async (event) => {
	// Check authentication
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	try {
		const body = await parseRequestBody<{ mediaIds: number[] }>(event.request)
		if (!body || !Array.isArray(body.mediaIds) || body.mediaIds.length === 0) {
			return errorResponse('Invalid request body. Expected array of media IDs.', 400)
		}

		const mediaIds = body.mediaIds.filter((id) => typeof id === 'number' && !isNaN(id))
		if (mediaIds.length === 0) {
			return errorResponse('No valid media IDs provided', 400)
		}

		// Get media records before deletion to extract URLs for cleanup
		const mediaRecords = await prisma.media.findMany({
			where: { id: { in: mediaIds } },
			select: { id: true, url: true, thumbnailUrl: true, filename: true }
		})

		if (mediaRecords.length === 0) {
			return errorResponse('No media files found with the provided IDs', 404)
		}

		// Delete files from storage (Cloudinary or local)
		const storageDeleteResults: Array<{
			id: number
			filename: string
			deleted: boolean
			error?: string
		}> = []

		for (const media of mediaRecords) {
			try {
				let deleted = false
				
				// Check if it's a Cloudinary URL
				if (media.url.includes('cloudinary.com')) {
					const publicId = extractPublicId(media.url)
					if (publicId) {
						deleted = await deleteFile(publicId)
						if (!deleted) {
							logger.warn('Failed to delete from Cloudinary', { publicId, mediaId: media.id })
						}
					}
				} else if (media.url.includes('/local-uploads/')) {
					// Local storage deletion
					deleted = await deleteFileLocally(media.url)
					if (!deleted) {
						logger.warn('Failed to delete from local storage', { url: media.url, mediaId: media.id })
					}
				}

				// Also try to delete thumbnail if it exists
				if (media.thumbnailUrl) {
					if (media.thumbnailUrl.includes('cloudinary.com')) {
						const thumbPublicId = extractPublicId(media.thumbnailUrl)
						if (thumbPublicId && thumbPublicId !== extractPublicId(media.url)) {
							await deleteFile(thumbPublicId)
						}
					}
				}

				storageDeleteResults.push({
					id: media.id,
					filename: media.filename,
					deleted
				})
			} catch (error) {
				logger.error('Error deleting file from storage', {
					mediaId: media.id,
					url: media.url,
					error: error instanceof Error ? error.message : 'Unknown error'
				})
				storageDeleteResults.push({
					id: media.id,
					filename: media.filename,
					deleted: false,
					error: error instanceof Error ? error.message : 'Unknown error'
				})
			}
		}

		// Remove media usage tracking for all affected media
		for (const mediaId of mediaIds) {
			await prisma.mediaUsage.deleteMany({
				where: { mediaId }
			})
		}

		// Clean up references in content that uses these media files
		await cleanupMediaReferences(mediaIds)

		// Delete the media records from database
		const deleteResult = await prisma.media.deleteMany({
			where: { id: { in: mediaIds } }
		})

		// Count successful storage deletions
		const successfulStorageDeletions = storageDeleteResults.filter(r => r.deleted).length
		const failedStorageDeletions = storageDeleteResults.filter(r => !r.deleted)

		logger.info('Bulk media deletion completed', {
			deletedCount: deleteResult.count,
			storageDeletedCount: successfulStorageDeletions,
			storageFailedCount: failedStorageDeletions.length,
			mediaIds,
			filenames: mediaRecords.map((m) => m.filename)
		})

		return jsonResponse({
			success: true,
			message: `Successfully deleted ${deleteResult.count} media file${deleteResult.count > 1 ? 's' : ''} from database`,
			deletedCount: deleteResult.count,
			storageDeletedCount: successfulStorageDeletions,
			storageFailures: failedStorageDeletions.length > 0 ? failedStorageDeletions : undefined,
			deletedFiles: mediaRecords.map((m) => ({ id: m.id, filename: m.filename }))
		})
	} catch (error) {
		logger.error('Failed to bulk delete media files', error as Error)
		return errorResponse('Failed to delete media files', 500)
	}
}

/**
 * Clean up references to deleted media in all content types
 */
async function cleanupMediaReferences(mediaIds: number[]) {
	const mediaUrls = await prisma.media.findMany({
		where: { id: { in: mediaIds } },
		select: { url: true }
	})
	const urlsToRemove = mediaUrls.map((m) => m.url)

	// Clean up projects
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
		let needsUpdate = false
		const updateData: any = {}

		// Check featured image
		if (project.featuredImage && urlsToRemove.includes(project.featuredImage)) {
			updateData.featuredImage = null
			needsUpdate = true
		}

		// Check logo URL
		if (project.logoUrl && urlsToRemove.includes(project.logoUrl)) {
			updateData.logoUrl = null
			needsUpdate = true
		}

		// Check gallery
		if (project.gallery && Array.isArray(project.gallery)) {
			const filteredGallery = project.gallery.filter((item: any) => {
				const itemId = typeof item === 'object' ? item.id : parseInt(item)
				return !mediaIds.includes(itemId)
			})
			if (filteredGallery.length !== project.gallery.length) {
				updateData.gallery = filteredGallery.length > 0 ? filteredGallery : null
				needsUpdate = true
			}
		}

		// Check case study content
		if (project.caseStudyContent) {
			const cleanedContent = cleanContentFromMedia(project.caseStudyContent, mediaIds, urlsToRemove)
			if (cleanedContent !== project.caseStudyContent) {
				updateData.caseStudyContent = cleanedContent
				needsUpdate = true
			}
		}

		if (needsUpdate) {
			await prisma.project.update({
				where: { id: project.id },
				data: updateData
			})
			logger.info('Cleaned up media references in project', { projectId: project.id })
		}
	}

	// Clean up posts
	const posts = await prisma.post.findMany({
		select: {
			id: true,
			featuredImage: true,
			content: true,
			attachments: true
		}
	})

	for (const post of posts) {
		let needsUpdate = false
		const updateData: any = {}

		// Check featured image
		if (post.featuredImage && urlsToRemove.includes(post.featuredImage)) {
			updateData.featuredImage = null
			needsUpdate = true
		}

		// Check attachments
		if (post.attachments && Array.isArray(post.attachments)) {
			const filteredAttachments = post.attachments.filter((item: any) => {
				const itemId = typeof item === 'object' ? item.id : parseInt(item)
				return !mediaIds.includes(itemId)
			})
			if (filteredAttachments.length !== post.attachments.length) {
				updateData.attachments = filteredAttachments.length > 0 ? filteredAttachments : null
				needsUpdate = true
			}
		}

		// Check post content
		if (post.content) {
			const cleanedContent = cleanContentFromMedia(post.content, mediaIds, urlsToRemove)
			if (cleanedContent !== post.content) {
				updateData.content = cleanedContent
				needsUpdate = true
			}
		}

		if (needsUpdate) {
			await prisma.post.update({
				where: { id: post.id },
				data: updateData
			})
			logger.info('Cleaned up media references in post', { postId: post.id })
		}
	}
}

/**
 * Remove media references from rich text content
 */
function cleanContentFromMedia(content: any, mediaIds: number[], urlsToRemove: string[]): any {
	if (!content || typeof content !== 'object') return content

	function cleanNode(node: any): any {
		if (!node) return node

		// Remove image nodes that reference deleted media
		if (node.type === 'image' && node.attrs?.src) {
			const shouldRemove = urlsToRemove.some((url) => node.attrs.src.includes(url))
			if (shouldRemove) {
				return null // Mark for removal
			}
		}

		// Clean gallery nodes
		if (node.type === 'gallery' && node.attrs?.images) {
			const filteredImages = node.attrs.images.filter((image: any) => !mediaIds.includes(image.id))

			if (filteredImages.length === 0) {
				return null // Remove empty gallery
			} else if (filteredImages.length !== node.attrs.images.length) {
				return {
					...node,
					attrs: {
						...node.attrs,
						images: filteredImages
					}
				}
			}
		}

		// Recursively clean child nodes
		if (node.content) {
			const cleanedContent = node.content.map(cleanNode).filter((child: any) => child !== null)

			return {
				...node,
				content: cleanedContent
			}
		}

		return node
	}

	return cleanNode(content)
}
