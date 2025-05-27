import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { jsonResponse, errorResponse, checkAdminAuth } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'

// GET /api/media/[id]/usage - Check where media is used
export const GET: RequestHandler = async (event) => {
	// Check authentication
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	const id = parseInt(event.params.id)
	if (isNaN(id)) {
		return errorResponse('Invalid media ID', 400)
	}

	try {
		const media = await prisma.media.findUnique({
			where: { id },
			select: {
				id: true,
				filename: true,
				url: true,
				usedIn: true
			}
		})

		if (!media) {
			return errorResponse('Media not found', 404)
		}

		// Parse the usedIn field and fetch details
		const usage = (media.usedIn as Array<{ type: string; id: number }>) || []
		const detailedUsage = []

		for (const item of usage) {
			try {
				let details = null

				switch (item.type) {
					case 'post':
						details = await prisma.post.findUnique({
							where: { id: item.id },
							select: { id: true, title: true, slug: true, postType: true }
						})
						break
					case 'project':
						details = await prisma.project.findUnique({
							where: { id: item.id },
							select: { id: true, title: true, slug: true }
						})
						break
				}

				if (details) {
					detailedUsage.push({
						type: item.type,
						...details
					})
				}
			} catch (error) {
				logger.warn('Failed to fetch usage details', { type: item.type, id: item.id })
			}
		}

		return jsonResponse({
			media: {
				id: media.id,
				filename: media.filename,
				url: media.url
			},
			usage: detailedUsage,
			isUsed: detailedUsage.length > 0
		})
	} catch (error) {
		logger.error('Failed to check media usage', error as Error)
		return errorResponse('Failed to check media usage', 500)
	}
}
