import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { checkAdminAuth, jsonResponse, errorResponse, parseRequestBody } from '$lib/server/api-utils'

export const GET: RequestHandler = async (event) => {
	if (!checkAdminAuth(event)) return errorResponse('Unauthorized', 401)

	let profile = await prisma.profile.findFirst()
	if (!profile) {
		profile = await prisma.profile.create({ data: {} })
	}

	return jsonResponse({ profile })
}

export const PUT: RequestHandler = async (event) => {
	if (!checkAdminAuth(event)) return errorResponse('Unauthorized', 401)

	const body = await parseRequestBody<{
		bio?: unknown
		shortBio?: string
		headline?: string
		location?: string
		avatarUrl?: string
	}>(event.request)

	if (!body) return errorResponse('Invalid request body')

	let profile = await prisma.profile.findFirst()

	if (profile) {
		profile = await prisma.profile.update({
			where: { id: profile.id },
			data: {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				bio: body.bio !== undefined ? (body.bio as any) : undefined,
				shortBio: body.shortBio,
				headline: body.headline,
				location: body.location,
				avatarUrl: body.avatarUrl
			}
		})
	} else {
		profile = await prisma.profile.create({
			data: {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				bio: body.bio as any,
				shortBio: body.shortBio,
				headline: body.headline,
				location: body.location,
				avatarUrl: body.avatarUrl
			}
		})
	}

	return jsonResponse({ profile })
}
