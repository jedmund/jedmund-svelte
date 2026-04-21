import type { Handle } from '@sveltejs/kit'
import '$lib/server/env'
import { getSessionUser } from '$lib/server/admin/session'

// --- Rate limiter ---
interface RateLimitConfig {
	prefix: string
	max: number
	windowMs: number
}

const RATE_LIMITS: RateLimitConfig[] = [
	{ prefix: '/admin/login', max: 5, windowMs: 60_000 },
	{ prefix: '/api/projects/', max: 5, windowMs: 60_000 },
	{ prefix: '/api/media/upload', max: 30, windowMs: 60_000 },
	{ prefix: '/api/media/bulk-upload', max: 30, windowMs: 60_000 }
]

const attempts = new Map<string, { count: number; resetAt: number }>()

function matchLimit(pathname: string, method: string): RateLimitConfig | null {
	if (method !== 'POST') return null
	return RATE_LIMITS.find((cfg) => pathname.startsWith(cfg.prefix)) ?? null
}

function isRateLimited(key: string, config: RateLimitConfig): boolean {
	const now = Date.now()
	const entry = attempts.get(key)

	if (!entry || now > entry.resetAt) {
		attempts.set(key, { count: 1, resetAt: now + config.windowMs })
		return false
	}

	entry.count++
	return entry.count > config.max
}

// Periodically clean up stale entries
const cleanup = setInterval(() => {
	const now = Date.now()
	for (const [key, entry] of attempts) {
		if (now > entry.resetAt) {
			attempts.delete(key)
		}
	}
}, 5 * 60_000)
cleanup.unref()

// --- Security headers ---
const securityHeaders: Record<string, string> = {
	'X-Frame-Options': 'DENY',
	'X-Content-Type-Options': 'nosniff',
	'Referrer-Policy': 'strict-origin-when-cross-origin',
	'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
	'Content-Security-Policy': [
		"default-src 'self'",
		"script-src 'self' 'unsafe-inline'",
		"style-src 'self' 'unsafe-inline'",
		"img-src 'self' data: blob: https://res.cloudinary.com https://*.mzstatic.com https://*.last.fm https://lastfm.freetls.fastly.net https://*.steampowered.com https://*.steamstatic.com https://image.api.playstation.com https://*.cbsistatic.com https://img.youtube.com https://images.igdb.com https://*.anilist.co https://image.tmdb.org https://artworks.thetvdb.com https://covers.openlibrary.org https://*.us.archive.org",
		"font-src 'self'",
		"connect-src 'self' https://res.cloudinary.com",
		"media-src 'self' blob: https://res.cloudinary.com https://audio-ssl.itunes.apple.com",
		"frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
		"frame-ancestors 'none'"
	].join('; ')
}

function withSecurityHeaders(response: Response): Response {
	for (const [header, value] of Object.entries(securityHeaders)) {
		response.headers.set(header, value)
	}
	return response
}

function requiresAdmin(pathname: string): boolean {
	return pathname.startsWith('/api/admin/')
}

function unauthorized(): Response {
	return withSecurityHeaders(
		new Response(JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		})
	)
}

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url
	const method = event.request.method

	const limit = matchLimit(pathname, method)
	if (limit) {
		const ip = event.getClientAddress()
		const key = `${limit.prefix}:${ip}`
		if (isRateLimited(key, limit)) {
			return withSecurityHeaders(
				new Response('Too many attempts. Try again in a minute.', {
					status: 429,
					headers: { 'Retry-After': '60' }
				})
			)
		}
	}

	if (requiresAdmin(pathname)) {
		if (!getSessionUser(event.cookies)) {
			return unauthorized()
		}
	}

	const response = await resolve(event)
	return withSecurityHeaders(response)
}
