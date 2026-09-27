import { readValidatedBody } from '$lib/api/validation'
import { createProjectSchema, validatePublishing } from '$lib/schemas/cms'
import { nullableJsonInput } from '$lib/server/json-input'
import { PaginationError } from '$lib/server/pagination'
import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import {
	jsonResponse,
	errorResponse,
	getPaginationParams,
	getPaginationMeta,
	checkAdminAuth
} from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'
import { getUnlockedProjectIds } from '$lib/server/admin/session'
import { createSlug, ensureUniqueSlug } from '$lib/server/database'
import { getProjects, sanitizeProjectList } from '$lib/server/queries/projects'
import {
	trackMediaUsage,
	extractMediaIds,
	type MediaUsageReference
} from '$lib/server/media-usage.js'

// GET /api/projects - List all projects
export const GET: RequestHandler = async (event) => {
	try {
		const { page, limit } = getPaginationParams(event.url)
		const isAdmin = checkAdminAuth(event)

		const { projects, total } = await getProjects({
			isAdmin,
			status: event.url.searchParams.get('status') ?? undefined,
			projectType: event.url.searchParams.get('projectType') ?? undefined,
			includeListOnly: event.url.searchParams.get('includeListOnly') === 'true',
			includePasswordProtected: event.url.searchParams.get('includePasswordProtected') === 'true',
			page,
			limit
		})

		logger.info('Projects list retrieved', { total, page, limit })

		const safeProjects = isAdmin
			? projects
			: sanitizeProjectList(projects, { unlockedIds: getUnlockedProjectIds(event.cookies) })

		return jsonResponse({
			projects: safeProjects,
			pagination: getPaginationMeta(total, page, limit)
		})
	} catch (error) {
		if (error instanceof PaginationError) return error.response()
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
		const parsed = await readValidatedBody(event.request, createProjectSchema)
		if (!parsed.success) return parsed.response
		const body = parsed.data

		// Generate slug
		const baseSlug = body.slug || createSlug(body.title)
		const slug = await ensureUniqueSlug(baseSlug, 'project')

		const invalid = validatePublishing('project', {
			...body,
			slug,
			status: body.status ?? 'draft',
			projectType: body.projectType ?? 'work'
		})
		if (invalid) return invalid

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
				gallery: nullableJsonInput(body.gallery ?? []),
				externalUrl: body.externalUrl,
				caseStudyContent: nullableJsonInput(body.caseStudyContent),
				backgroundColor: body.backgroundColor,
				highlightColor: body.highlightColor,
				projectType: body.projectType || 'work',
				displayOrder: body.displayOrder || 0,
				status: body.status || 'draft',
				password: body.password || null,
				publishedAt: body.status === 'published' ? new Date() : null,
				showFeaturedImageInHeader: body.showFeaturedImageInHeader ?? true,
				showBackgroundColorInHeader: body.showBackgroundColorInHeader ?? true,
				showLogoInHeader: body.showLogoInHeader ?? true
			}
		})

		// Track media usage
		try {
			const usageReferences: MediaUsageReference[] = []

			// Track featured image
			const featuredImageIds = extractMediaIds(body, 'featuredImage')
			featuredImageIds.forEach((mediaId) => {
				usageReferences.push({
					mediaId,
					contentType: 'project',
					contentId: project.id,
					fieldName: 'featuredImage'
				})
			})

			// Track logo
			const logoIds = extractMediaIds(body, 'logoUrl')
			logoIds.forEach((mediaId) => {
				usageReferences.push({
					mediaId,
					contentType: 'project',
					contentId: project.id,
					fieldName: 'logoUrl'
				})
			})

			// Track gallery images
			const galleryIds = extractMediaIds(body, 'gallery')
			galleryIds.forEach((mediaId) => {
				usageReferences.push({
					mediaId,
					contentType: 'project',
					contentId: project.id,
					fieldName: 'gallery'
				})
			})

			// Track media in case study content
			const contentIds = extractMediaIds(body, 'caseStudyContent')
			contentIds.forEach((mediaId) => {
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
			logger.warn('Failed to track media usage for project', {
				projectId: project.id,
				error: error instanceof Error ? error.message : String(error)
			})
		}

		logger.info('Project created', { id: project.id, slug: project.slug })

		return jsonResponse(project, 201)
	} catch (error) {
		logger.error('Failed to create project', error as Error)
		return errorResponse('Failed to create project', 500)
	}
}
