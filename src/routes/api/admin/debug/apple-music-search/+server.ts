import type { RequestHandler } from './$types'
import { searchAlbumsAndSongs } from '$lib/server/apple-music-client'
import { dev } from '$app/environment'

export const POST: RequestHandler = async ({ request }) => {
	// Only allow in development
	if (!dev) {
		return new Response('Not found', { status: 404 })
	}

	try {
		const { query, storefront } = await request.json()

		if (!query) {
			return new Response('Query is required', { status: 400 })
		}

		// Perform the search
		const results = await searchAlbumsAndSongs(query, 25, storefront || 'us')

		return new Response(JSON.stringify(results), {
			headers: { 'Content-Type': 'application/json' }
		})
	} catch (error) {
		console.error('Apple Music search error:', error)
		return new Response(
			JSON.stringify({
				error: error instanceof Error ? error.message : 'Unknown error'
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		)
	}
}
