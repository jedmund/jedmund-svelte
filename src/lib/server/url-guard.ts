/**
 * SSRF guard for server-side fetches of user-supplied urls.
 *
 * Blocks non-http(s) schemes and literal loopback/private/link-local hosts.
 * Accepted residual gap (same posture as the og-image-proxy this came from):
 * no DNS resolution or redirect re-validation, so a public hostname that
 * resolves to a private address is not caught.
 */
export function isDisallowedHost(hostname: string): boolean {
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

export function assertAllowedExternalUrl(raw: string): URL {
	let target: URL
	try {
		target = new URL(raw)
	} catch {
		throw new Error('Invalid URL')
	}
	if (target.protocol !== 'https:' && target.protocol !== 'http:') {
		throw new Error('Unsupported URL scheme')
	}
	if (isDisallowedHost(target.hostname)) {
		throw new Error('Disallowed host')
	}
	return target
}
