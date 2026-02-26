import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse, checkAdminAuth } from '$lib/server/api-utils'

// PATCH /api/syndication/:id - Update a syndication record's externalUrl
export const PATCH: RequestHandler = async (event) => {
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	const id = parseInt(event.params.id)
	if (isNaN(id)) {
		return errorResponse('Invalid syndication ID', 400)
	}

	try {
		const { externalUrl } = await event.request.json()

		if (typeof externalUrl !== 'string') {
			return errorResponse('externalUrl is required', 400)
		}

		const record = await prisma.syndication.update({
			where: { id },
			data: { externalUrl }
		})

		return jsonResponse(record)
	} catch {
		return errorResponse('Failed to update syndication record', 500)
	}
}
