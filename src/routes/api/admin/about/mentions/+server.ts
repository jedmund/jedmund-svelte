import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { checkAdminAuth, jsonResponse, errorResponse, parseRequestBody } from '$lib/server/api-utils'

export const GET: RequestHandler = async (event) => {
	if (!checkAdminAuth(event)) return errorResponse('Unauthorized', 401)

	const items = await prisma.mention.findMany({
		orderBy: { displayOrder: 'asc' }
	})

	return jsonResponse({ items })
}

interface MentionInput {
	id?: number
	title: string
	href: string
	source?: string
	sourceType: string
	date: string
	isActive?: boolean
	displayOrder?: number
}

export const PUT: RequestHandler = async (event) => {
	if (!checkAdminAuth(event)) return errorResponse('Unauthorized', 401)

	const body = await parseRequestBody<{
		items: MentionInput[]
		deleted?: number[]
	}>(event.request)

	if (!body || !Array.isArray(body.items)) return errorResponse('Invalid request body')

	const result = await prisma.$transaction(async (tx) => {
		if (body.deleted && body.deleted.length > 0) {
			await tx.mention.deleteMany({
				where: { id: { in: body.deleted } }
			})
		}

		const upserted = []
		for (const item of body.items) {
			const data = {
				title: item.title,
				href: item.href,
				source: item.source || null,
				sourceType: item.sourceType,
				date: item.date,
				isActive: item.isActive ?? true,
				displayOrder: item.displayOrder ?? 0
			}

			if (item.id) {
				const updated = await tx.mention.update({
					where: { id: item.id },
					data
				})
				upserted.push(updated)
			} else {
				const created = await tx.mention.create({ data })
				upserted.push(created)
			}
		}

		return upserted
	})

	return jsonResponse({ items: result })
}
