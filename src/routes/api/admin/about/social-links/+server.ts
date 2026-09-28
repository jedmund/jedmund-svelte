import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { checkAdminAuth, jsonResponse, errorResponse, parseRequestBody } from '$lib/server/api-utils'

export const GET: RequestHandler = async (event) => {
	if (!checkAdminAuth(event)) return errorResponse('Unauthorized', 401)

	const items = await prisma.socialLink.findMany({
		orderBy: { displayOrder: 'asc' }
	})

	return jsonResponse({ items })
}

interface SocialLinkInput {
	id?: number
	platform: string
	label: string
	url: string
	isActive?: boolean
	displayOrder?: number
}

export const PUT: RequestHandler = async (event) => {
	if (!checkAdminAuth(event)) return errorResponse('Unauthorized', 401)

	const body = await parseRequestBody<{
		items: SocialLinkInput[]
		deleted?: number[]
	}>(event.request)

	if (!body || !Array.isArray(body.items)) return errorResponse('Invalid request body')

	const result = await prisma.$transaction(async (tx) => {
		// Delete removed items
		if (body.deleted && body.deleted.length > 0) {
			await tx.socialLink.deleteMany({
				where: { id: { in: body.deleted } }
			})
		}

		// Upsert each item
		const upserted = []
		for (const item of body.items) {
			if (item.id) {
				const updated = await tx.socialLink.update({
					where: { id: item.id },
					data: {
						platform: item.platform,
						label: item.label,
						url: item.url,
						isActive: item.isActive ?? true,
						displayOrder: item.displayOrder ?? 0
					}
				})
				upserted.push(updated)
			} else {
				const created = await tx.socialLink.create({
					data: {
						platform: item.platform,
						label: item.label,
						url: item.url,
						isActive: item.isActive ?? true,
						displayOrder: item.displayOrder ?? 0
					}
				})
				upserted.push(created)
			}
		}

		return upserted
	})

	return jsonResponse({ items: result })
}
