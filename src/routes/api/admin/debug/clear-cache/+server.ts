import type { RequestHandler } from './$types'
import redis from '../../../redis-client'
import { logger } from '$lib/server/logger'
import { dev } from '$app/environment'
import { checkAdminAuth } from '$lib/server/api-utils'

export const POST: RequestHandler = async (event) => {
	if (!checkAdminAuth(event)) {
		return new Response('Unauthorized', { status: 401 })
	}

	// Only allow in development
	if (!dev) {
		return new Response('Not found', { status: 404 })
	}

	try {
		const { key, pattern } = await event.request.json()
		
		if (!key && !pattern) {
			return new Response('Key or pattern is required', { status: 400 })
		}
		
		let deleted = 0
		
		if (pattern) {
			// Delete by pattern (e.g., "apple:album:*")
			logger.music('debug', `Clearing cache by pattern: ${pattern}`)
			
			// Get all matching keys
			const keys = await redis.keys(pattern)
			
			if (keys.length > 0) {
				// Delete all matching keys
				deleted = await redis.del(...keys)
				logger.music('debug', `Deleted ${deleted} keys matching pattern: ${pattern}`)
			}
		} else if (key) {
			// Delete specific key
			logger.music('debug', `Clearing cache for key: ${key}`)
			deleted = await redis.del(key)
		}
		
		return new Response(JSON.stringify({ 
			success: true, 
			deleted,
			key: key || pattern
		}), {
			headers: { 'Content-Type': 'application/json' }
		})
	} catch (error) {
		logger.error('Failed to clear cache:', error as Error)
		return new Response('Internal server error', { status: 500 })
	}
}