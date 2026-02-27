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

interface GardenItemUpdateBody {
	category?: string
	title?: string
	slug?: string
	creator?: string
	imageUrl?: string
	url?: string
	date?: string | null
	note?: unknown
	rating?: number | null
	isCurrent?: boolean
	isFavorite?: boolean
	displayOrder?: number
	updatedAt?: string
}

// GET /api/admin/garden/[id] - Get a single garden item
export const GET: RequestHandler = async (event) => {
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	const id = parseInt(event.params.id)
	if (isNaN(id)) {
		return errorResponse('Invalid item ID', 400)
	}

	try {
		const item = await prisma.gardenItem.findUnique({ where: { id } })

		if (!item) {
			return errorResponse('Garden item not found', 404)
		}

		return jsonResponse(item)
	} catch (error) {
		logger.error('Failed to retrieve garden item', error as Error)
		return errorResponse('Failed to retrieve garden item', 500)
	}
}

// PUT /api/admin/garden/[id] - Update a garden item
export const PUT: RequestHandler = async (event) => {
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	const id = parseInt(event.params.id)
	if (isNaN(id)) {
		return errorResponse('Invalid item ID', 400)
	}

	try {
		const body = await parseRequestBody<GardenItemUpdateBody>(event.request)
		if (!body) {
			return errorResponse('Invalid request body', 400)
		}

		const existing = await prisma.gardenItem.findUnique({ where: { id } })
		if (!existing) {
			return errorResponse('Garden item not found', 404)
		}

		// Concurrency check
		if (body.updatedAt) {
			const incoming = new Date(body.updatedAt)
			if (existing.updatedAt.getTime() !== incoming.getTime()) {
				return errorResponse('Conflict: item has changed', 409)
			}
		}

		// Validate category if provided
		if (body.category && !isValidCategory(body.category)) {
			return errorResponse('Invalid category', 400)
		}

		// Handle slug update
		let slug = existing.slug
		const category = body.category ?? existing.category
		if (body.slug && body.slug !== existing.slug) {
			slug = await ensureUniqueCategorySlug(body.slug, category, id)
		} else if (body.title && body.title !== existing.title && !body.slug) {
			// Re-slugify if title changed and no explicit slug provided
			const baseSlug = createSlug(body.title)
			if (baseSlug !== existing.slug) {
				slug = await ensureUniqueCategorySlug(baseSlug, category, id)
			}
		}

		const item = await prisma.gardenItem.update({
			where: { id },
			data: {
				category,
				title: body.title ?? existing.title,
				slug,
				creator: body.creator !== undefined ? body.creator || null : existing.creator,
				imageUrl: body.imageUrl !== undefined ? body.imageUrl || null : existing.imageUrl,
				url: body.url !== undefined ? body.url || null : existing.url,
				date: body.date !== undefined ? (body.date ? new Date(body.date) : null) : existing.date,
				note: body.note !== undefined ? (body.note as any) : existing.note,
				rating:
					body.rating !== undefined
						? body.rating != null
							? Math.min(5, Math.max(1, body.rating))
							: null
						: existing.rating,
				isCurrent: body.isCurrent ?? existing.isCurrent,
				isFavorite: body.isFavorite ?? existing.isFavorite,
				displayOrder: body.displayOrder ?? existing.displayOrder
			}
		})

		logger.info('Garden item updated', { id: item.id, slug: item.slug })

		return jsonResponse(item)
	} catch (error) {
		logger.error('Failed to update garden item', error as Error)
		return errorResponse('Failed to update garden item', 500)
	}
}

// DELETE /api/admin/garden/[id] - Delete a garden item
export const DELETE: RequestHandler = async (event) => {
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	const id = parseInt(event.params.id)
	if (isNaN(id)) {
		return errorResponse('Invalid item ID', 400)
	}

	try {
		await prisma.gardenItem.delete({ where: { id } })
		logger.info('Garden item deleted', { id })
		return new Response(null, { status: 204 })
	} catch (error) {
		logger.error('Failed to delete garden item', error as Error)
		return errorResponse('Failed to delete garden item', 500)
	}
}
