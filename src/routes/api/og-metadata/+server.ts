import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { scrapeOgMetadata } from '$lib/server/og-metadata'

export const GET: RequestHandler = async ({ url }) => {
	const targetUrl = url.searchParams.get('url')
	const forceRefresh = url.searchParams.get('refresh') === 'true'

	if (!targetUrl) {
		return json({ error: 'URL parameter is required' }, { status: 400 })
	}

	try {
		const metadata = await scrapeOgMetadata(targetUrl, { forceRefresh })
		return json(metadata)
	} catch (error) {
		console.error('Error fetching OpenGraph data:', error)
		return json({ error: 'Failed to fetch metadata', url: targetUrl }, { status: 500 })
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
