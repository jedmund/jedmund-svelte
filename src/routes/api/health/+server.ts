import type { RequestHandler } from './$types'
import { prisma } from '$lib/server/database'
import { isCloudinaryConfigured } from '$lib/server/cloudinary'
import { jsonResponse, errorResponse } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'

export const GET: RequestHandler = async () => {
	try {
		// Test database connection
		await prisma.$queryRaw`SELECT 1`

		const health = {
			status: 'ok',
			timestamp: new Date().toISOString(),
			services: {
				database: 'connected',
				redis: 'not configured', // We'll add this later
				cloudinary: isCloudinaryConfigured() ? 'configured' : 'not configured'
			}
		}

		logger.info('Health check passed', health)
		return jsonResponse(health)
	} catch (error) {
		logger.error('Health check failed', error as Error)
		return errorResponse('Service unavailable', 503)
	}
}
