import type { Handle } from '@sveltejs/kit'

// --- Rate limiter ---
const attempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 60_000 // 1 minute

function isRateLimited(key: string): boolean {
	const now = Date.now()
	const entry = attempts.get(key)

	if (!entry || now > entry.resetAt) {
		attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
		return false
	}

	entry.count++
	return entry.count > MAX_ATTEMPTS
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
		"img-src 'self' data: blob: https://res.cloudinary.com https://*.mzstatic.com https://*.last.fm https://lastfm.freetls.fastly.net https://*.steampowered.com https://*.steamstatic.com https://image.api.playstation.com https://*.cbsistatic.com https://img.youtube.com",
		"font-src 'self'",
		"connect-src 'self'",
		"media-src 'self' blob: https://res.cloudinary.com",
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

// Paths that accept passwords and should be rate-limited
const RATE_LIMITED_POSTS = [
	'/admin/login',
	'/api/projects/' // matches /api/projects/123/unlock
]

function shouldRateLimit(pathname: string, method: string): boolean {
	if (method !== 'POST') return false
	return RATE_LIMITED_POSTS.some((prefix) => pathname.startsWith(prefix))
}

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url
	const method = event.request.method

	if (shouldRateLimit(pathname, method)) {
		const ip = event.getClientAddress()
		if (isRateLimited(ip)) {
			return withSecurityHeaders(
				new Response('Too many attempts. Try again in a minute.', {
					status: 429,
					headers: { 'Retry-After': '60' }
				})
			)
		}
	}

	const response = await resolve(event)
	return withSecurityHeaders(response)
}
