import type { RequestHandler } from './$types'
import redis from '../../../redis-client'
import { dev } from '$app/environment'

export const GET: RequestHandler = async ({ url }) => {
	// Only allow in development
	if (!dev) {
		return new Response('Not found', { status: 404 })
	}

	try {
		const pattern = url.searchParams.get('pattern') || '*'

		// Get all keys matching pattern
		const keys = await redis.keys(pattern)

		// Get values for each key (limit to first 100 to avoid overload)
		const keysWithValues = await Promise.all(
			keys.slice(0, 100).map(async (key) => {
				const value = await redis.get(key)
				const ttl = await redis.ttl(key)
				return {
					key,
					value: value ? (value.length > 200 ? value.substring(0, 200) + '...' : value) : null,
					ttl
				}
			})
		)

		return new Response(
			JSON.stringify({
				total: keys.length,
				showing: keysWithValues.length,
				keys: keysWithValues
			}),
			{
				headers: { 'Content-Type': 'application/json' }
			}
		)
	} catch (error) {
		console.error('Failed to get Redis keys:', error)
		return new Response('Internal server error', { status: 500 })
	}
}
