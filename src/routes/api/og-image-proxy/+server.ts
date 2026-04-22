import type { RequestHandler } from './$types'

const FETCH_TIMEOUT_MS = 8000
const MAX_BYTES = 10 * 1024 * 1024
const BROWSER_UA =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

/**
 * Same-origin image proxy for og:image thumbnails so cross-origin urls don't trip
 * our CSP (`img-src 'self'`). Kept strict to limit SSRF surface: http/https only,
 * no private/loopback hosts, image content-type only, hard byte ceiling.
 *
 * This is a compatibility shim. New posts get their link-card images downloaded
 * and stored as Media at save time — those render from /api/media/* directly
 * and bypass the proxy entirely.
 */
export const GET: RequestHandler = async ({ url, fetch: svelteFetch, setHeaders }) => {
	const src = url.searchParams.get('url')
	if (!src) return new Response('missing url', { status: 400 })

	let target: URL
	try {
		target = new URL(src)
	} catch {
		return new Response('invalid url', { status: 400 })
	}

	if (target.protocol !== 'https:' && target.protocol !== 'http:') {
		return new Response('unsupported scheme', { status: 400 })
	}
	if (isDisallowedHost(target.hostname)) {
		return new Response('disallowed host', { status: 400 })
	}

	const fetchFn = (typeof svelteFetch === 'function' ? svelteFetch : fetch) as typeof fetch
	let upstream: Response
	try {
		upstream = await fetchFn(target.href, {
			headers: { 'User-Agent': BROWSER_UA, Accept: 'image/*' },
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
			redirect: 'follow'
		})
	} catch {
		return new Response('upstream fetch failed', { status: 502 })
	}

	if (!upstream.ok || !upstream.body) {
		return new Response('upstream error', { status: 502 })
	}

	const contentType = (upstream.headers.get('content-type') || '').split(';')[0].trim()
	if (!contentType.startsWith('image/')) {
		return new Response('not an image', { status: 415 })
	}

	const contentLength = Number(upstream.headers.get('content-length') || '0')
	if (contentLength > MAX_BYTES) {
		return new Response('image too large', { status: 413 })
	}

	setHeaders({
		'Content-Type': contentType,
		'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800'
	})

	return new Response(upstream.body, { status: 200 })
}

function isDisallowedHost(hostname: string): boolean {
	const h = hostname.toLowerCase()
	if (h === 'localhost' || h === '' || h === '::1') return true
	// Literal IPv4 checks — block loopback, private ranges, link-local, reserved.
	const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
	if (v4) {
		const [a, b] = [Number(v4[1]), Number(v4[2])]
		if (a === 10 || a === 127) return true
		if (a === 169 && b === 254) return true
		if (a === 172 && b >= 16 && b <= 31) return true
		if (a === 192 && b === 168) return true
		if (a === 0) return true
	}
	// IPv6 literals in URLs are bracketed; URL.hostname strips brackets.
	if (h.includes(':') && (h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80'))) {
		return true
	}
	return false
}
