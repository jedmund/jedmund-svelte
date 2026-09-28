import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse } from '$lib/server/api-utils'

export const GET: RequestHandler = async () => {
	const [profile, socialLinks, mentions] = await Promise.all([
		prisma.profile.findFirst(),
		prisma.socialLink.findMany({
			where: { isActive: true },
			orderBy: { displayOrder: 'asc' }
		}),
		prisma.mention.findMany({
			where: { isActive: true },
			orderBy: { displayOrder: 'asc' }
		})
	])

	return jsonResponse({
		profile: profile || null,
		socialLinks,
		mentions
	})
}
