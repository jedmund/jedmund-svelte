import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import {
	jsonResponse,
	errorResponse,
	getPaginationParams,
	getPaginationMeta,
	checkAdminAuth,
	parseRequestBody
} from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'
import { createSlug, ensureUniqueSlug } from '$lib/server/database'
import { trackMediaUsage, extractMediaIds, type MediaUsageReference } from '$lib/server/media-usage.js'

// GET /api/projects - List all projects
export const GET: RequestHandler = async (event) => {
	try {
		const { page, limit } = getPaginationParams(event.url)
		const skip = (page - 1) * limit

		// Get filter parameters
		const status = event.url.searchParams.get('status')
		const projectType = event.url.searchParams.get('projectType')
		const includeListOnly = event.url.searchParams.get('includeListOnly') === 'true'
		const includePasswordProtected = event.url.searchParams.get('includePasswordProtected') === 'true'

		// Build where clause
		const where: any = {}
		
		if (status) {
			where.status = status
		} else {
			// Default behavior: determine which statuses to include
			const allowedStatuses = ['published']
			
			if (includeListOnly) {
				allowedStatuses.push('list-only')
			}
			
			if (includePasswordProtected) {
				allowedStatuses.push('password-protected')
			}
			
			where.status = { in: allowedStatuses }
		}
		
		if (projectType) {
			where.projectType = projectType
		}

		// Get total count
		const total = await prisma.project.count({ where })

		// Get projects
		const projects = await prisma.project.findMany({
			where,
			orderBy: [{ displayOrder: 'asc' }, { year: 'desc' }, { createdAt: 'desc' }],
			skip,
			take: limit
		})

		const pagination = getPaginationMeta(total, page, limit)

		logger.info('Projects list retrieved', { total, page, limit })

		return jsonResponse({
			projects,
			pagination
		})
	} catch (error) {
		logger.error('Failed to retrieve projects', error as Error)
		return errorResponse('Failed to retrieve projects', 500)
	}
}

// POST /api/projects - Create a new project
export const POST: RequestHandler = async (event) => {
	// Check authentication
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	try {
		const body = await parseRequestBody<any>(event.request)
		if (!body) {
			return errorResponse('Invalid request body', 400)
		}

		// Validate required fields
		if (!body.title || !body.year) {
			return errorResponse('Title and year are required', 400)
		}

		// Generate slug
		const baseSlug = body.slug || createSlug(body.title)
		const slug = await ensureUniqueSlug(baseSlug, 'project')

		// Create project
		const project = await prisma.project.create({
			data: {
				slug,
				title: body.title,
				subtitle: body.subtitle,
				description: body.description,
				year: body.year,
				client: body.client,
				role: body.role,
				featuredImage: body.featuredImage,
				logoUrl: body.logoUrl,
				gallery: body.gallery || [],
				externalUrl: body.externalUrl,
				caseStudyContent: body.caseStudyContent,
				backgroundColor: body.backgroundColor,
				highlightColor: body.highlightColor,
				projectType: body.projectType || 'work',
				displayOrder: body.displayOrder || 0,
				status: body.status || 'draft',
				password: body.password || null,
				publishedAt: body.status === 'published' ? new Date() : null
			}
		})

		// Track media usage
		try {
			const usageReferences: MediaUsageReference[] = []

			// Track featured image
			const featuredImageIds = extractMediaIds(body, 'featuredImage')
			featuredImageIds.forEach(mediaId => {
				usageReferences.push({
					mediaId,
					contentType: 'project',
					contentId: project.id,
					fieldName: 'featuredImage'
				})
			})

			// Track logo
			const logoIds = extractMediaIds(body, 'logoUrl')
			logoIds.forEach(mediaId => {
				usageReferences.push({
					mediaId,
					contentType: 'project',
					contentId: project.id,
					fieldName: 'logoUrl'
				})
			})

			// Track gallery images
			const galleryIds = extractMediaIds(body, 'gallery')
			galleryIds.forEach(mediaId => {
				usageReferences.push({
					mediaId,
					contentType: 'project',
					contentId: project.id,
					fieldName: 'gallery'
				})
			})

			// Track media in case study content
			const contentIds = extractMediaIds(body, 'caseStudyContent')
			contentIds.forEach(mediaId => {
				usageReferences.push({
					mediaId,
					contentType: 'project',
					contentId: project.id,
					fieldName: 'content'
				})
			})

			if (usageReferences.length > 0) {
				await trackMediaUsage(usageReferences)
			}
		} catch (error) {
			logger.warn('Failed to track media usage for project', { projectId: project.id, error })
		}

		logger.info('Project created', { id: project.id, slug: project.slug })

		return jsonResponse(project, 201)
	} catch (error) {
		logger.error('Failed to create project', error as Error)
		return errorResponse('Failed to create project', 500)
	}
}
