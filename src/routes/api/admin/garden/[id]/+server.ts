import { readValidatedBody, parseId } from '$lib/api/validation'
import { updateGardenSchema, validatePublishing } from '$lib/schemas/cms'
import { nullableJsonInput } from '$lib/server/json-input'
import type { RequestHandler } from './$types'
import { prisma, createSlug, ensureUniqueCategorySlug } from '$lib/server/database'
import { jsonResponse, errorResponse } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'
import { cacheGardenImage } from '$lib/server/garden-images'
import { isCloudinaryUrl, extractPublicId, deleteFile } from '$lib/server/cloudinary'

// GET /api/admin/garden/[id] - Get a single garden item
export const GET: RequestHandler = async (event) => {
	const id = parseId(event.params.id)
	if (id === null) {
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
	const id = parseId(event.params.id)
	if (id === null) {
		return errorResponse('Invalid item ID', 400)
	}

	try {
		const parsed = await readValidatedBody(event.request, updateGardenSchema)
		if (!parsed.success) return parsed.response
		const body = parsed.data

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

		// Handle status transitions
		const newStatus = body.status ?? existing.status
		let publishedAt = existing.publishedAt
		if (newStatus === 'published' && existing.status !== 'published') {
			publishedAt = new Date()
		} else if (newStatus === 'draft') {
			publishedAt = null
		}

		const invalid = validatePublishing('garden', {
			...existing,
			...body,
			slug,
			category,
			status: newStatus
		})
		if (invalid) return invalid

		// Cache image through Cloudinary if imageUrl changed
		let imageUrl = existing.imageUrl
		let sourceImageUrl = existing.sourceImageUrl
		if (body.imageUrl !== undefined) {
			const cached = await cacheGardenImage(
				body.imageUrl || null,
				existing.imageUrl,
				existing.sourceImageUrl
			)
			imageUrl = cached.imageUrl
			sourceImageUrl = cached.sourceImageUrl
		}

		const item = await prisma.gardenItem.update({
			where: { id },
			data: {
				category,
				title: body.title ?? existing.title,
				slug,
				creator: body.creator !== undefined ? body.creator || null : existing.creator,
				imageUrl,
				sourceImageUrl,
				url: body.url !== undefined ? body.url || null : existing.url,
				sourceId: body.sourceId !== undefined ? body.sourceId || null : existing.sourceId,
				metadata: nullableJsonInput(body.metadata),
				summary: body.summary !== undefined ? body.summary || null : existing.summary,
				date: body.date !== undefined ? (body.date ? new Date(body.date) : null) : existing.date,
				note: nullableJsonInput(body.note),
				rating: body.rating !== undefined ? body.rating : existing.rating,
				isCurrent: body.isCurrent ?? existing.isCurrent,
				isFavorite: body.isFavorite ?? existing.isFavorite,
				showInUniverse: body.showInUniverse ?? existing.showInUniverse,
				displayOrder: body.displayOrder ?? existing.displayOrder,
				status: newStatus,
				publishedAt
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
	const id = parseId(event.params.id)
	if (id === null) {
		return errorResponse('Invalid item ID', 400)
	}

	try {
		// Clean up Cloudinary image before deleting
		const item = await prisma.gardenItem.findUnique({ where: { id } })
		if (item?.imageUrl && isCloudinaryUrl(item.imageUrl)) {
			const publicId = extractPublicId(item.imageUrl)
			if (publicId) {
				await deleteFile(publicId)
			}
		}

		await prisma.gardenItem.delete({ where: { id } })
		logger.info('Garden item deleted', { id })
		return jsonResponse({ success: true })
	} catch (error) {
		logger.error('Failed to delete garden item', error as Error)
		return errorResponse('Failed to delete garden item', 500)
	}
}
