import type { RequestHandler } from './$types'
import type { Prisma } from '@prisma/client'
import { prisma } from '$lib/server/database'
import {
	jsonResponse,
	errorResponse,
	checkAdminAuth,
	parseRequestBody
} from '$lib/server/api-utils'
import { getUnlockedProjectIds } from '$lib/server/admin/session'
import { logger } from '$lib/server/logger'
import { syndicateContent } from '$lib/server/syndication/syndicate'
import { ensureUniqueSlug } from '$lib/server/database'
import {
	trackMediaUsage,
	removeMediaUsage,
	extractMediaIds,
	type MediaUsageReference
} from '$lib/server/media-usage.js'

// Type for project update request body (partial of ProjectCreateBody)
interface ProjectUpdateBody {
	title?: string
	subtitle?: string
	description?: string
	year?: number
	client?: string
	role?: string
	featuredImage?: string
	logoUrl?: string
	gallery?: Prisma.JsonValue
	externalUrl?: string
	caseStudyContent?: Prisma.JsonValue
	backgroundColor?: string
	highlightColor?: string
	projectType?: string
	displayOrder?: number
	status?: string
	password?: string | null
	slug?: string
	showFeaturedImageInHeader?: boolean
	showBackgroundColorInHeader?: boolean
	showLogoInHeader?: boolean
	updatedAt?: string
}

// GET /api/projects/[id] - Get a single project
export const GET: RequestHandler = async (event) => {
	const id = parseInt(event.params.id)
	if (isNaN(id)) {
		return errorResponse('Invalid project ID', 400)
	}

	const isAdmin = checkAdminAuth(event)

	try {
		const project = await prisma.project.findUnique({
			where: { id }
		})

		if (!project) {
			return errorResponse('Project not found', 404)
		}

		// Non-admin users can only see published and password-protected projects
		if (!isAdmin && project.status !== 'published' && project.status !== 'password-protected' && project.status !== 'list-only') {
			return errorResponse('Project not found', 404)
		}

		// Strip password and lock content for non-admin users
		if (!isAdmin) {
			const { password: _, ...safeProject } = project
			const isLocked = project.status === 'password-protected' &&
				!getUnlockedProjectIds(event.cookies).includes(id)

			if (isLocked) {
				return jsonResponse({
					...safeProject,
					caseStudyContent: null,
					gallery: [],
					hasPassword: true,
					locked: true
				})
			}
			return jsonResponse({ ...safeProject, hasPassword: !!project.password, locked: false })
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
		const body = await parseRequestBody<ProjectUpdateBody>(event.request)
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

		// Concurrency control: if updatedAt provided, ensure it matches current
		if (body.updatedAt) {
			const incoming = new Date(body.updatedAt)
			if (existing.updatedAt.getTime() !== incoming.getTime()) {
				return errorResponse('Conflict: project has changed', 409)
			}
		}

		// Update project
		const project = await prisma.project.update({
			where: { id },
			data: {
				slug,
				title: body.title !== undefined ? body.title : existing.title,
				subtitle: body.subtitle !== undefined ? body.subtitle : existing.subtitle,
				description: body.description !== undefined ? body.description : existing.description,
				year: body.year !== undefined ? body.year : existing.year,
				client: body.client !== undefined ? body.client : existing.client,
				role: body.role !== undefined ? body.role : existing.role,
				featuredImage:
					body.featuredImage !== undefined ? body.featuredImage : existing.featuredImage,
				logoUrl: body.logoUrl !== undefined ? body.logoUrl : existing.logoUrl,
				gallery: (body.gallery !== undefined ? body.gallery : existing.gallery) as Prisma.InputJsonValue ?? undefined,
				externalUrl: body.externalUrl !== undefined ? body.externalUrl : existing.externalUrl,
				caseStudyContent:
					(body.caseStudyContent !== undefined ? body.caseStudyContent : existing.caseStudyContent) as Prisma.InputJsonValue ?? undefined,
				backgroundColor:
					body.backgroundColor !== undefined ? body.backgroundColor : existing.backgroundColor,
				highlightColor:
					body.highlightColor !== undefined ? body.highlightColor : existing.highlightColor,
				projectType: body.projectType !== undefined ? body.projectType : existing.projectType,
				displayOrder: body.displayOrder !== undefined ? body.displayOrder : existing.displayOrder,
				status: body.status !== undefined ? body.status : existing.status,
				password: body.password !== undefined ? body.password : existing.password,
				publishedAt:
					body.status === 'published' && !existing.publishedAt ? new Date() : existing.publishedAt,
				showFeaturedImageInHeader:
					body.showFeaturedImageInHeader !== undefined
						? body.showFeaturedImageInHeader
						: existing.showFeaturedImageInHeader,
				showBackgroundColorInHeader:
					body.showBackgroundColorInHeader !== undefined
						? body.showBackgroundColorInHeader
						: existing.showBackgroundColorInHeader,
				showLogoInHeader:
					body.showLogoInHeader !== undefined
						? body.showLogoInHeader
						: existing.showLogoInHeader
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
			logger.warn('Failed to update media usage tracking for project', { projectId: id, error: error instanceof Error ? error.message : String(error) })
		}

		logger.info('Project updated', { id: project.id, slug: project.slug })

		if (project.status === 'published' && existing.status !== 'published') {
			syndicateContent('project', project.id)
				.catch(err => logger.error('Auto-syndication failed', err as Error))
		}

		return jsonResponse(project)
	} catch (error) {
		logger.error('Failed to update project', error as Error)
		return errorResponse('Failed to update project', 500)
	}
}

// PATCH /api/projects/[id] - Partially update a project
export const PATCH: RequestHandler = async (event) => {
	// Check authentication
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	const id = parseInt(event.params.id)
	if (isNaN(id)) {
		return errorResponse('Invalid project ID', 400)
	}

	try {
		const body = await parseRequestBody<ProjectUpdateBody>(event.request)
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

		// Concurrency control: if updatedAt provided, ensure it matches current
		if (body.updatedAt) {
			const incoming = new Date(body.updatedAt)
			if (existing.updatedAt.getTime() !== incoming.getTime()) {
				return errorResponse('Conflict: project has changed', 409)
			}
		}

		// Build update data object with only provided fields
		const updateData: Prisma.ProjectUpdateInput = {}

		// Handle status update specially
		if (body.status !== undefined) {
			updateData.status = body.status
			// Set publishedAt if changing to published for the first time
			if (body.status === 'published' && !existing.publishedAt) {
				updateData.publishedAt = new Date()
			}
			// Clear publishedAt if changing to draft
			else if (body.status === 'draft') {
				updateData.publishedAt = null
			}
		}

		// Add other fields if provided
		if (body.title !== undefined) updateData.title = body.title
		if (body.subtitle !== undefined) updateData.subtitle = body.subtitle
		if (body.description !== undefined) updateData.description = body.description
		if (body.year !== undefined) updateData.year = body.year
		if (body.client !== undefined) updateData.client = body.client
		if (body.role !== undefined) updateData.role = body.role
		if (body.featuredImage !== undefined) updateData.featuredImage = body.featuredImage
		if (body.logoUrl !== undefined) updateData.logoUrl = body.logoUrl
		if (body.gallery !== undefined) updateData.gallery = (body.gallery as Prisma.InputJsonValue) ?? undefined
		if (body.externalUrl !== undefined) updateData.externalUrl = body.externalUrl
		if (body.caseStudyContent !== undefined) updateData.caseStudyContent = (body.caseStudyContent as Prisma.InputJsonValue) ?? undefined
		if (body.backgroundColor !== undefined) updateData.backgroundColor = body.backgroundColor
		if (body.highlightColor !== undefined) updateData.highlightColor = body.highlightColor
		if (body.projectType !== undefined) updateData.projectType = body.projectType
		if (body.displayOrder !== undefined) updateData.displayOrder = body.displayOrder
		if (body.password !== undefined) updateData.password = body.password
		if (body.showFeaturedImageInHeader !== undefined)
			updateData.showFeaturedImageInHeader = body.showFeaturedImageInHeader
		if (body.showBackgroundColorInHeader !== undefined)
			updateData.showBackgroundColorInHeader = body.showBackgroundColorInHeader
		if (body.showLogoInHeader !== undefined) updateData.showLogoInHeader = body.showLogoInHeader

		// Handle slug update if provided
		if (body.slug && body.slug !== existing.slug) {
			updateData.slug = await ensureUniqueSlug(body.slug, 'project', id)
		}

		// Update project
		const project = await prisma.project.update({
			where: { id },
			data: updateData
		})

		logger.info('Project partially updated', { id: project.id, fields: Object.keys(updateData).join(', ') })

		if (body.status === 'published' && existing.status !== 'published') {
			syndicateContent('project', project.id)
				.catch(err => logger.error('Auto-syndication failed', err as Error))
		}

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
