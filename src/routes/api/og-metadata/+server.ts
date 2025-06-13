import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import redis from '../redis-client'

export const GET: RequestHandler = async ({ url }) => {
	const targetUrl = url.searchParams.get('url')
	const forceRefresh = url.searchParams.get('refresh') === 'true'

	if (!targetUrl) {
		return json({ error: 'URL parameter is required' }, { status: 400 })
	}

	try {
		// Check cache first (unless force refresh is requested)
		const cacheKey = `og-metadata:${targetUrl}`
		
		if (!forceRefresh) {
			const cached = await redis.get(cacheKey)
			
			if (cached) {
				console.log(`Cache hit for ${targetUrl}`)
				return json(JSON.parse(cached))
			}
		} else {
			console.log(`Force refresh requested for ${targetUrl}`)
		}

		// Fetch the HTML content
		const response = await fetch(targetUrl, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (compatible; OpenGraphBot/1.0)'
			}
		})

		if (!response.ok) {
			throw new Error(`Failed to fetch URL: ${response.status}`)
		}

		const html = await response.text()

		// Parse OpenGraph tags
		const ogData = {
			url: targetUrl,
			title: extractMetaContent(html, 'og:title') || extractTitle(html),
			description:
				extractMetaContent(html, 'og:description') || extractMetaContent(html, 'description'),
			image: extractMetaContent(html, 'og:image'),
			siteName: extractMetaContent(html, 'og:site_name'),
			favicon: extractFavicon(targetUrl, html)
		}

		// Cache for 24 hours (86400 seconds)
		await redis.set(cacheKey, JSON.stringify(ogData), 'EX', 86400)
		console.log(`Cached metadata for ${targetUrl}`)

		return json(ogData)
	} catch (error) {
		console.error('Error fetching OpenGraph data:', error)
		return json(
			{
				error: 'Failed to fetch metadata',
				url: targetUrl
			},
			{ status: 500 }
		)
	}
}

function extractMetaContent(html: string, property: string): string | null {
	// Try property attribute first (for og: tags)
	const propertyMatch = html.match(
		new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i')
	)
	if (propertyMatch) return propertyMatch[1]

	// Try name attribute (for description)
	const nameMatch = html.match(
		new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i')
	)
	if (nameMatch) return nameMatch[1]

	// Try content first pattern
	const contentFirstMatch = html.match(
		new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${property}["']`, 'i')
	)
	if (contentFirstMatch) return contentFirstMatch[1]

	return null
}

function extractTitle(html: string): string | null {
	const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
	return match ? match[1].trim() : null
}

function extractFavicon(baseUrl: string, html: string): string | null {
	// Special case for GitHub
	if (baseUrl.includes('github.com')) {
		return 'https://github.githubassets.com/favicons/favicon.svg'
	}

	// Try various favicon patterns
	const patterns = [
		/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i,
		/<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i,
		/<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i
	]

	for (const pattern of patterns) {
		const match = html.match(pattern)
		if (match) {
			const favicon = match[1]
			// Convert relative URLs to absolute
			if (favicon.startsWith('http')) {
				return favicon
			} else if (favicon.startsWith('//')) {
				return 'https:' + favicon
			} else if (favicon.startsWith('/')) {
				const url = new URL(baseUrl)
				return `${url.protocol}//${url.host}${favicon}`
			} else {
				const url = new URL(baseUrl)
				return `${url.protocol}//${url.host}/${favicon}`
			}
		}
	}

	// Default favicon path
	try {
		const url = new URL(baseUrl)
		return `${url.protocol}//${url.host}/favicon.ico`
	} catch {
		return null
	}
}

// Add POST handler for Editor.js link tool
export const POST: RequestHandler = async ({ request }) => {
	const { url: targetUrl } = await request.json()

	if (!targetUrl) {
		return json({ success: 0 }, { status: 400 })
	}

	try {
		// Check cache first - using same cache key format
		const cacheKey = `og-metadata:${targetUrl}`
		const cached = await redis.get(cacheKey)
		
		if (cached) {
			console.log(`Cache hit for ${targetUrl} (POST)`)
			const ogData = JSON.parse(cached)
			return json({
				success: 1,
				link: targetUrl,
				meta: {
					title: ogData.title || '',
					description: ogData.description || '',
					image: {
						url: ogData.image || ''
					}
				}
			})
		}

		// Fetch the HTML content
		const response = await fetch(targetUrl, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (compatible; OpenGraphBot/1.0)'
			}
		})

		if (!response.ok) {
			throw new Error(`Failed to fetch URL: ${response.status}`)
		}

		const html = await response.text()

		// Parse OpenGraph tags
		const title = extractMetaContent(html, 'og:title') || extractTitle(html)
		const description =
			extractMetaContent(html, 'og:description') || extractMetaContent(html, 'description')
		const image = extractMetaContent(html, 'og:image')
		const siteName = extractMetaContent(html, 'og:site_name')
		const favicon = extractFavicon(targetUrl, html)

		// Cache the data in the same format as GET
		const ogData = {
			url: targetUrl,
			title,
			description,
			image,
			siteName,
			favicon
		}
		await redis.set(cacheKey, JSON.stringify(ogData), 'EX', 86400)
		console.log(`Cached metadata for ${targetUrl} (POST)`)

		return json({
			success: 1,
			link: targetUrl,
			meta: {
				title: title || '',
				description: description || '',
				image: {
					url: image || ''
				}
			}
		})
	} catch (error) {
		console.error('Error fetching OpenGraph data:', error)
		return json(
			{
				success: 0
			},
			{ status: 500 }
		)
	}
}
