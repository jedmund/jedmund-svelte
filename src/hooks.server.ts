import type { Handle } from '@sveltejs/kit'

// --- Login rate limiter ---
const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const MAX_LOGIN_ATTEMPTS = 5
const WINDOW_MS = 60_000 // 1 minute

function isLoginRateLimited(ip: string): boolean {
	const now = Date.now()
	const entry = loginAttempts.get(ip)

	if (!entry || now > entry.resetAt) {
		loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
		return false
	}

	entry.count++
	return entry.count > MAX_LOGIN_ATTEMPTS
}

// Periodically clean up stale entries
setInterval(() => {
	const now = Date.now()
	for (const [ip, entry] of loginAttempts) {
		if (now > entry.resetAt) {
			loginAttempts.delete(ip)
		}
	}
}, 5 * 60_000)

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
		"frame-ancestors 'none'"
	].join('; ')
}

export const handle: Handle = async ({ event, resolve }) => {
	// Rate limit login attempts
	if (event.url.pathname === '/admin/login' && event.request.method === 'POST') {
		const ip = event.getClientAddress()
		if (isLoginRateLimited(ip)) {
			return new Response('Too many login attempts. Try again in a minute.', {
				status: 429,
				headers: { 'Retry-After': '60' }
			})
		}
	}

	const response = await resolve(event)

	// Add security headers to all responses
	for (const [header, value] of Object.entries(securityHeaders)) {
		response.headers.set(header, value)
	}

	return response
}
