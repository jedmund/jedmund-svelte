import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { scrapeOgMetadata, type OgMetadata } from '$lib/server/og-metadata'

export const GET: RequestHandler = async ({ url }) => {
	const targetUrl = url.searchParams.get('url')
	const forceRefresh = url.searchParams.get('refresh') === 'true'

	if (!targetUrl) {
		return json({ error: 'URL parameter is required' }, { status: 400 })
	}

	try {
		const metadata = await scrapeOgMetadata(targetUrl, { forceRefresh })
		return json(proxyRemoteImage(metadata))
	} catch (error) {
		console.error('Error fetching OpenGraph data:', error)
		return json({ error: 'Failed to fetch metadata', url: targetUrl }, { status: 500 })
	}
}

/**
 * Rewrite the image url to point at our same-origin proxy so browsers with a
 * strict `img-src 'self'` CSP can still render the preview during editing.
 * Server-side callers (enrichUrlEmbeds) call `scrapeOgMetadata` directly and
 * keep the raw url, which is what gets downloaded into Media at save time.
 */
function proxyRemoteImage(metadata: OgMetadata): OgMetadata {
	if (!metadata.image) return metadata
	if (metadata.image.startsWith('/')) return metadata
	return {
		...metadata,
		image: `/api/og-image-proxy?url=${encodeURIComponent(metadata.image)}`
	}
}

export const POST: RequestHandler = async ({ request }) => {
	const { url: targetUrl } = await request.json()

	if (!targetUrl) {
		return json({ success: 0 }, { status: 400 })
	}

	try {
		const metadata = await scrapeOgMetadata(targetUrl)
		return json({
			success: 1,
			link: targetUrl,
			meta: {
				title: metadata.title || '',
				description: metadata.description || '',
				image: {
					url: metadata.image || ''
				}
			}
		})
	} catch (error) {
		console.error('Error fetching OpenGraph data:', error)
		return json({ success: 0 }, { status: 500 })
	}
}
