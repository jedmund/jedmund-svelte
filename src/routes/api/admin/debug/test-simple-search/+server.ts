import type { RequestHandler } from './$types'
import { searchAlbumsAndSongs } from '$lib/server/apple-music-client'
import { dev } from '$app/environment'
import { checkAdminAuth } from '$lib/server/api-utils'

export const GET: RequestHandler = async (event) => {
	if (!checkAdminAuth(event)) {
		return new Response('Unauthorized', { status: 401 })
	}

	if (!dev) {
		return new Response('Not found', { status: 404 })
	}

	// Test simple search
	const searchQuery = '藤井風 Hachikō'
	console.log(`Testing simple search for: ${searchQuery}`)
	
	try {
		// Search in both storefronts
		const jpResults = await searchAlbumsAndSongs(searchQuery, 5, 'jp')
		const usResults = await searchAlbumsAndSongs(searchQuery, 5, 'us')
		
		// Check if we found the song in either storefront
		const jpSongs = jpResults.results?.songs?.data || []
		const usSongs = usResults.results?.songs?.data || []
		
		const hachiko = [...jpSongs, ...usSongs].find(s => 
			s.attributes?.name?.toLowerCase() === 'hachikō' &&
			s.attributes?.artistName?.includes('藤井')
		)
		
		return new Response(JSON.stringify({
			searchQuery,
			jpSongsFound: jpSongs.length,
			usSongsFound: usSongs.length,
			hachikoFound: !!hachiko,
			hachikoDetails: hachiko ? {
				name: hachiko.attributes?.name,
				artist: hachiko.attributes?.artistName,
				album: hachiko.attributes?.albumName,
				preview: hachiko.attributes?.previews?.[0]?.url
			} : null,
			allSongs: [...jpSongs, ...usSongs].map(s => ({
				name: s.attributes?.name,
				artist: s.attributes?.artistName,
				album: s.attributes?.albumName
			}))
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