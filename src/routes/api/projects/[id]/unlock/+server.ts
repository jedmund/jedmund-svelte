import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse, parseRequestBody } from '$lib/server/api-utils'
import { addProjectUnlock } from '$lib/server/admin/session'
import { timingSafeEqual } from 'node:crypto'

interface UnlockBody {
	password: string
}

export const POST: RequestHandler = async (event) => {
	const id = parseInt(event.params.id)
	if (isNaN(id)) {
		return errorResponse('Invalid project ID', 400)
	}

	const body = await parseRequestBody<UnlockBody>(event.request)
	if (!body?.password) {
		return errorResponse('Password is required', 400)
	}

	try {
		const project = await prisma.project.findUnique({
			where: { id },
			select: { password: true, status: true }
		})

		if (!project || project.status !== 'password-protected' || !project.password) {
			return errorResponse('Project not found', 404)
		}

		// Timing-safe password comparison
		const providedBuf = Buffer.from(body.password)
		const expectedBuf = Buffer.from(project.password)

		let match = providedBuf.length === expectedBuf.length
		try {
			if (match) {
				match = timingSafeEqual(providedBuf, expectedBuf)
			}
		} catch {
			match = false
		}

		if (!match) {
			return errorResponse('Incorrect password', 401)
		}

		addProjectUnlock(event.cookies, id)
		return jsonResponse({ success: true })
	} catch {
		return errorResponse('Failed to verify password', 500)
	}
}
