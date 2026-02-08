import type { RequestHandler } from './$types'
import redis from '../../redis-client'

const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW = 3600 // 1 hour in seconds

const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type'
}

function isEmoji(str: string): boolean {
	const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' })
	const segments = [...segmenter.segment(str)]
	if (segments.length !== 1) return false
	return /\p{Emoji}/u.test(segments[0].segment)
}

function extractEmoji(body: string): string | null {
	// Strip trailing `=` from HTML form submissions (per Open Heart spec)
	const cleaned = body.replace(/=+$/, '').trim()
	if (!cleaned) return null

	const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' })
	const segments = [...segmenter.segment(cleaned)]
	if (segments.length === 0) return null

	const firstGrapheme = segments[0].segment
	if (!isEmoji(firstGrapheme)) return null

	return firstGrapheme
}

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export const POST: RequestHandler = async ({ params, request, getClientAddress }) => {
	const path = params.path
	if (!path) {
		return new Response('Bad Request', { status: 400, headers: CORS_HEADERS })
	}

	// Rate limiting
	const ip = getClientAddress()
	const rateLimitKey = `openheart:ratelimit:${ip}:${path}`

	try {
		const current = await redis.get(rateLimitKey)
		if (current && parseInt(current) >= RATE_LIMIT_MAX) {
			return new Response('Rate limit exceeded', { status: 429, headers: CORS_HEADERS })
		}
	} catch {
		// If Redis fails for rate limiting, allow the request through
	}

	// Parse emoji from request body
	const body = await request.text()
	const emoji = extractEmoji(body)

	if (!emoji) {
		return new Response('Invalid emoji', { status: 400, headers: CORS_HEADERS })
	}

	// Increment the counter atomically
	const redisKey = `openheart:${path}:${emoji}`

	try {
		await redis.incr(redisKey)

		// Increment rate limit counter
		const rlResult = await redis.incr(rateLimitKey)
		if (rlResult === 1) {
			await redis.expire(rateLimitKey, RATE_LIMIT_WINDOW)
		}
	} catch {
		return new Response('Internal Server Error', { status: 500, headers: CORS_HEADERS })
	}

	return new Response('recorded', {
		status: 200,
		headers: { 'Content-Type': 'text/plain', ...CORS_HEADERS }
	})
}

export const GET: RequestHandler = async ({ params }) => {
	const path = params.path
	if (!path) {
		return new Response('Bad Request', { status: 400, headers: CORS_HEADERS })
	}

	try {
		// Find all emoji counters for this path
		const pattern = `openheart:${path}:*`
		const keys = await redis.keys(pattern)

		const result: Record<string, number> = {}

		if (keys.length > 0) {
			const values = await redis.mget(...keys)
			for (let i = 0; i < keys.length; i++) {
				// Extract emoji from key: "openheart:universe/hello-world:❤️" → "❤️"
				const emoji = keys[i].slice(`openheart:${path}:`.length)
				result[emoji] = parseInt(values[i] || '0')
			}
		}

		return new Response(JSON.stringify(result), {
			status: 200,
			headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
		})
	} catch {
		return new Response('Internal Server Error', { status: 500, headers: CORS_HEADERS })
	}
}
