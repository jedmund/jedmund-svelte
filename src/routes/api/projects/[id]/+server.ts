import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import {
	jsonResponse,
	errorResponse,
	checkAdminAuth,
	parseRequestBody
} from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'
import { ensureUniqueSlug } from '$lib/server/database'
import {
	updateMediaUsage,
	removeMediaUsage,
	extractMediaIds,
	type MediaUsageReference
} from '$lib/server/media-usage.js'

// GET /api/projects/[id] - Get a single project
export const GET: RequestHandler = async (event) => {
	const id = parseInt(event.params.id)
	if (isNaN(id)) {
		return errorResponse('Invalid project ID', 400)
	}

	try {
		const project = await prisma.project.findUnique({
			where: { id }
		})

		if (!project) {
			return errorResponse('Project not found', 404)
		}

		return jsonResponse(project)
	} catch (error) {
		logger.error('Failed to retrieve project', error as Error)
		return errorResponse('Failed to retrieve project', 500)
	}
}

// PUT /api/projects/[id] - Update a project
export const PUT: RequestHandler = async (event) => {
	// Check authentication
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	const id = parseInt(event.params.id)
	if (isNaN(id)) {
		return errorResponse('Invalid project ID', 400)
	}

	try {
		const body = await parseRequestBody<any>(event.request)
		if (!body) {
			return errorResponse('Invalid request body', 400)
		}

		// Check if project exists
		const existing = await prisma.project.findUnique({
			where: { id }
		})

		if (!existing) {
			return errorResponse('Project not found', 404)
		}

		// Handle slug update
		let slug = existing.slug
		if (body.slug && body.slug !== existing.slug) {
			slug = await ensureUniqueSlug(body.slug, 'project', id)
		}

		// Update project
		const project = await prisma.project.update({
			where: { id },
			data: {
				slug,
				title: body.title ?? existing.title,
				subtitle: body.subtitle ?? existing.subtitle,
				description: body.description ?? existing.description,
				year: body.year ?? existing.year,
				client: body.client ?? existing.client,
				role: body.role ?? existing.role,
				featuredImage: body.featuredImage ?? existing.featuredImage,
				logoUrl: body.logoUrl ?? existing.logoUrl,
				gallery: body.gallery ?? existing.gallery,
				externalUrl: body.externalUrl ?? existing.externalUrl,
				caseStudyContent: body.caseStudyContent ?? existing.caseStudyContent,
				backgroundColor: body.backgroundColor ?? existing.backgroundColor,
				highlightColor: body.highlightColor ?? existing.highlightColor,
				projectType: body.projectType ?? existing.projectType,
				displayOrder: body.displayOrder ?? existing.displayOrder,
				status: body.status ?? existing.status,
				password: body.password ?? existing.password,
				publishedAt:
					body.status === 'published' && !existing.publishedAt ? new Date() : existing.publishedAt
			}
		})

		// Update media usage tracking
		try {
			// Remove all existing usage for this project first
			await removeMediaUsage('project', id)

			// Track all current media usage in the updated project
			const usageReferences: MediaUsageReference[] = []

			// Track featured image
			const featuredImageIds = extractMediaIds(project, 'featuredImage')
			featuredImageIds.forEach((mediaId) => {
				usageReferences.push({
					mediaId,
					contentType: 'project',
					contentId: id,
					fieldName: 'featuredImage'
				})
			})

			// Track logo
			const logoIds = extractMediaIds(project, 'logoUrl')
			logoIds.forEach((mediaId) => {
				usageReferences.push({
					mediaId,
					contentType: 'project',
					contentId: id,
					fieldName: 'logoUrl'
				})
			})

			// Track gallery images
			const galleryIds = extractMediaIds(project, 'gallery')
			galleryIds.forEach((mediaId) => {
				usageReferences.push({
					mediaId,
					contentType: 'project',
					contentId: id,
					fieldName: 'gallery'
				})
			})

			// Track media in case study content
			const contentIds = extractMediaIds(project, 'caseStudyContent')
			contentIds.forEach((mediaId) => {
				usageReferences.push({
					mediaId,
					contentType: 'project',
					contentId: id,
					fieldName: 'content'
				})
			})

			if (usageReferences.length > 0) {
				await trackMediaUsage(usageReferences)
			}
		} catch (error) {
			logger.warn('Failed to update media usage tracking for project', { projectId: id, error })
		}

		logger.info('Project updated', { id: project.id, slug: project.slug })

		return jsonResponse(project)
	} catch (error) {
		logger.error('Failed to update project', error as Error)
		return errorResponse('Failed to update project', 500)
	}
}

// DELETE /api/projects/[id] - Delete a project
export const DELETE: RequestHandler = async (event) => {
	// Check authentication
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	const id = parseInt(event.params.id)
	if (isNaN(id)) {
		return errorResponse('Invalid project ID', 400)
	}

	try {
		// Remove media usage tracking first
		await removeMediaUsage('project', id)

		// Delete the project
		await prisma.project.delete({
			where: { id }
		})

		logger.info('Project deleted', { id })

		return new Response(null, { status: 204 })
	} catch (error) {
		logger.error('Failed to delete project', error as Error)
		return errorResponse('Failed to delete project', 500)
	}
}
