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

// GET /api/projects - List all projects
export const GET: RequestHandler = async (event) => {
	try {
		const { page, limit } = getPaginationParams(event.url)
		const skip = (page - 1) * limit

		// Get filter parameters
		const status = event.url.searchParams.get('status')

		// Build where clause
		const where: any = {}
		if (status) {
			where.status = status
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
				technologies: body.technologies || [],
				featuredImage: body.featuredImage,
				gallery: body.gallery || [],
				externalUrl: body.externalUrl,
				caseStudyContent: body.caseStudyContent,
				backgroundColor: body.backgroundColor,
				highlightColor: body.highlightColor,
				displayOrder: body.displayOrder || 0,
				status: body.status || 'draft',
				publishedAt: body.status === 'published' ? new Date() : null
			}
		})

		logger.info('Project created', { id: project.id, slug: project.slug })

		return jsonResponse(project, 201)
	} catch (error) {
		logger.error('Failed to create project', error as Error)
		return errorResponse('Failed to create project', 500)
	}
}
