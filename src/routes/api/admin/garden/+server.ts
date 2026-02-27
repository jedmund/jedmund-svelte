import type { RequestHandler } from './$types'
import { prisma, createSlug, ensureUniqueCategorySlug } from '$lib/server/database'
import {
	jsonResponse,
	errorResponse,
	checkAdminAuth,
	parseRequestBody
} from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'
import { isValidCategory } from '$lib/constants/garden'

interface GardenItemCreateBody {
	category: string
	title: string
	slug?: string
	creator?: string
	imageUrl?: string
	url?: string
	sourceId?: string
	metadata?: Record<string, any>
	summary?: string
	date?: string
	note?: unknown
	rating?: number
	isCurrent?: boolean
	isFavorite?: boolean
	displayOrder?: number
	status?: string
}

// GET /api/admin/garden - List all garden items
export const GET: RequestHandler = async (event) => {
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	try {
		const category = event.url.searchParams.get('category')

		const where = category ? { category } : {}

		const items = await prisma.gardenItem.findMany({
			where,
			orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }]
		})

		return jsonResponse({ items })
	} catch (error) {
		logger.error('Failed to retrieve garden items', error as Error)
		return errorResponse('Failed to retrieve garden items', 500)
	}
}

// POST /api/admin/garden - Create a new garden item
export const POST: RequestHandler = async (event) => {
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	try {
		const body = await parseRequestBody<GardenItemCreateBody>(event.request)
		if (!body) {
			return errorResponse('Invalid request body', 400)
		}

		if (!body.title || !body.category) {
			return errorResponse('Title and category are required', 400)
		}

		if (!isValidCategory(body.category)) {
			return errorResponse('Invalid category', 400)
		}

		const baseSlug = body.slug || createSlug(body.title)
		const slug = await ensureUniqueCategorySlug(baseSlug, body.category)

		const status = body.status === 'published' ? 'published' : 'draft'

		const item = await prisma.gardenItem.create({
			data: {
				category: body.category,
				title: body.title,
				slug,
				creator: body.creator || null,
				imageUrl: body.imageUrl || null,
				url: body.url || null,
				sourceId: body.sourceId || null,
				metadata: body.metadata !== undefined ? (body.metadata as any) : null,
				summary: body.summary || null,
				date: body.date ? new Date(body.date) : null,
				note: body.note !== undefined ? (body.note as any) : null,
				rating: body.rating != null ? Math.min(5, Math.max(1, body.rating)) : null,
				isCurrent: body.isCurrent ?? false,
				isFavorite: body.isFavorite ?? false,
				displayOrder: body.displayOrder ?? 0,
				status,
				publishedAt: status === 'published' ? new Date() : null
			}
		})

		logger.info('Garden item created', { id: item.id, slug: item.slug, category: item.category })

		return jsonResponse(item, 201)
	} catch (error) {
		logger.error('Failed to create garden item', error as Error)
		return errorResponse('Failed to create garden item', 500)
	}
}
