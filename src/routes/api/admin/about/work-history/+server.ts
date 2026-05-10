import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { checkAdminAuth, jsonResponse, errorResponse, parseRequestBody } from '$lib/server/api-utils'

export const GET: RequestHandler = async (event) => {
	if (!checkAdminAuth(event)) return errorResponse('Unauthorized', 401)

	const items = await prisma.workHistory.findMany({
		orderBy: { displayOrder: 'asc' }
	})

	return jsonResponse({ items })
}

interface WorkHistoryInput {
	id?: number
	company: string
	role: string
	url?: string
	startDate: string
	endDate?: string | null
	isCurrent?: boolean
	description?: string
	displayOrder?: number
}

export const PUT: RequestHandler = async (event) => {
	if (!checkAdminAuth(event)) return errorResponse('Unauthorized', 401)

	const body = await parseRequestBody<{
		items: WorkHistoryInput[]
		deleted?: number[]
	}>(event.request)

	if (!body || !Array.isArray(body.items)) return errorResponse('Invalid request body')

	const result = await prisma.$transaction(async (tx) => {
		if (body.deleted && body.deleted.length > 0) {
			await tx.workHistory.deleteMany({
				where: { id: { in: body.deleted } }
			})
		}

		const upserted = []
		for (const item of body.items) {
			const data = {
				company: item.company,
				role: item.role,
				url: item.url || null,
				startDate: new Date(item.startDate),
				endDate: item.endDate ? new Date(item.endDate) : null,
				isCurrent: item.isCurrent ?? false,
				description: item.description || null,
				displayOrder: item.displayOrder ?? 0
			}

			if (item.id) {
				const updated = await tx.workHistory.update({
					where: { id: item.id },
					data
				})
				upserted.push(updated)
			} else {
				const created = await tx.workHistory.create({ data })
				upserted.push(created)
			}
		}

		return upserted
	})

	return jsonResponse({ items: result })
}
