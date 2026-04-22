import redis from '../../routes/api/redis-client'
import { safeKey } from './cache-keys'

export interface OgMetadata {
	url: string
	title: string | null
	description: string | null
	image: string | null
	siteName: string | null
	favicon: string | null
}

interface ScrapeOptions {
	forceRefresh?: boolean
}

const TTL_WITH_IMAGE = 86400
const TTL_WITHOUT_IMAGE = 300
const FETCH_TIMEOUT_MS = 8000
const BROWSER_UA =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

export async function scrapeOgMetadata(
	targetUrl: string,
	{ forceRefresh = false }: ScrapeOptions = {}
): Promise<OgMetadata> {
	const cacheKey = `og-metadata:${safeKey(targetUrl)}`

	if (!forceRefresh) {
		const cached = await redis.get(cacheKey)
		if (cached) {
			return JSON.parse(cached) as OgMetadata
		}
	}

	const youtube = youtubeMetadata(targetUrl)
	if (youtube) {
		await cacheMetadata(cacheKey, youtube)
		return youtube
	}

	const response = await fetch(targetUrl, {
		headers: { 'User-Agent': BROWSER_UA },
		signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
		redirect: 'follow'
	})

	if (!response.ok) {
		throw new Error(`Failed to fetch URL: ${response.status}`)
	}

	const html = await response.text()
	const rawImage =
		extractMetaContent(html, 'og:image') ||
		extractMetaContent(html, 'og:image:url') ||
		extractMetaContent(html, 'og:image:secure_url') ||
		extractMetaContent(html, 'twitter:image') ||
		extractMetaContent(html, 'twitter:image:src') ||
		extractLinkHref(html, 'image_src')

	const metadata: OgMetadata = {
		url: targetUrl,
		title:
			extractMetaContent(html, 'og:title') ||
			extractMetaContent(html, 'twitter:title') ||
			extractTitle(html),
		description:
			extractMetaContent(html, 'og:description') ||
			extractMetaContent(html, 'twitter:description') ||
			extractMetaContent(html, 'description'),
		image: resolveAbsoluteUrl(rawImage, targetUrl),
		siteName: extractMetaContent(html, 'og:site_name'),
		favicon: extractFavicon(targetUrl, html)
	}

	await cacheMetadata(cacheKey, metadata)
	return metadata
}

async function cacheMetadata(cacheKey: string, metadata: OgMetadata): Promise<void> {
	const ttl = metadata.image ? TTL_WITH_IMAGE : TTL_WITHOUT_IMAGE
	await redis.set(cacheKey, JSON.stringify(metadata), 'EX', ttl)
}

function youtubeMetadata(targetUrl: string): OgMetadata | null {
	if (!/(?:youtube\.com|youtu\.be)/.test(targetUrl)) return null

	const patterns = [
		/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
		/youtube\.com\/watch\?.*v=([^&\n?#]+)/
	]

	for (const pattern of patterns) {
		const match = targetUrl.match(pattern)
		if (match && match[1]) {
			return {
				url: targetUrl,
				title: 'YouTube Video',
				description: 'Watch this video on YouTube',
				image: `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`,
				favicon: 'https://www.youtube.com/favicon.ico',
				siteName: 'YouTube'
			}
		}
	}

	return null
}

function extractMetaContent(html: string, property: string): string | null {
	const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	const propertyMatch = html.match(
		new RegExp(`<meta[^>]*property=["']${escaped}["'][^>]*content=["']([^"']*)["']`, 'i')
	)
	if (propertyMatch && propertyMatch[1]) return decodeEntities(propertyMatch[1])

	const nameMatch = html.match(
		new RegExp(`<meta[^>]*name=["']${escaped}["'][^>]*content=["']([^"']*)["']`, 'i')
	)
	if (nameMatch && nameMatch[1]) return decodeEntities(nameMatch[1])

	const contentFirstMatch = html.match(
		new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["']`, 'i')
	)
	if (contentFirstMatch && contentFirstMatch[1]) return decodeEntities(contentFirstMatch[1])

	return null
}

function extractLinkHref(html: string, rel: string): string | null {
	const escaped = rel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	const match =
		html.match(new RegExp(`<link[^>]*rel=["']${escaped}["'][^>]*href=["']([^"']+)["']`, 'i')) ||
		html.match(new RegExp(`<link[^>]*href=["']([^"']+)["'][^>]*rel=["']${escaped}["']`, 'i'))
	return match ? match[1] : null
}

function extractTitle(html: string): string | null {
	const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
	return match ? decodeEntities(match[1].trim()) : null
}

function extractFavicon(baseUrl: string, html: string): string | null {
	if (baseUrl.includes('github.com')) {
		return 'https://github.githubassets.com/favicons/favicon.svg'
	}

	const patterns = [
		/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i,
		/<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i,
		/<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i
	]

	for (const pattern of patterns) {
		const match = html.match(pattern)
		if (match) {
			return resolveAbsoluteUrl(match[1], baseUrl)
		}
	}

	try {
		const url = new URL(baseUrl)
		return `${url.protocol}//${url.host}/favicon.ico`
	} catch {
		return null
	}
}

function resolveAbsoluteUrl(raw: string | null, baseUrl: string): string | null {
	if (!raw) return null
	try {
		return new URL(raw, baseUrl).href
	} catch {
		return null
	}
}

function decodeEntities(text: string): string {
	return text
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&#x27;/g, "'")
		.replace(/&#x2F;/g, '/')
}
