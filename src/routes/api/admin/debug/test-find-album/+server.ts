import type { RequestHandler } from './$types'
import { findAlbum } from '$lib/server/apple-music-client'
import { dev } from '$app/environment'
import { checkAdminAuth } from '$lib/server/api-utils'

export const GET: RequestHandler = async (event) => {
	if (!checkAdminAuth(event)) {
		return new Response('Unauthorized', { status: 401 })
	}

	if (!dev) {
		return new Response('Not found', { status: 404 })
	}

	const artist = event.url.searchParams.get('artist') || '藤井風'
	const album = event.url.searchParams.get('album') || 'Hachikō'

	console.log(`Testing findAlbum for "${album}" by "${artist}"`)
	
	try {
		const result = await findAlbum(artist, album)
		return new Response(JSON.stringify({ 
			artist,
			album,
			found: !!result,
			result 
		}), {
			headers: { 'Content-Type': 'application/json' }
		})
	} catch (error) {
		return new Response(JSON.stringify({ 
			error: error instanceof Error ? error.message : 'Unknown error' 
		}), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		})
	}
}