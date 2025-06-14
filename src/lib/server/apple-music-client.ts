import { getAppleMusicHeaders } from './apple-music-auth'
import type {
	AppleMusicAlbum,
	AppleMusicTrack,
	AppleMusicSearchResponse,
	AppleMusicErrorResponse
} from '$lib/types/apple-music'
import { isAppleMusicError } from '$lib/types/apple-music'
import { ApiRateLimiter } from './rate-limiter'

const APPLE_MUSIC_API_BASE = 'https://api.music.apple.com/v1'
const DEFAULT_STOREFRONT = 'us' // Default to US storefront
const JAPANESE_STOREFRONT = 'jp' // Japanese storefront
const RATE_LIMIT_DELAY = 200 // 200ms between requests to stay well under 3000/hour

let lastRequestTime = 0
const rateLimiter = new ApiRateLimiter('apple-music')

async function rateLimitedFetch(url: string, options?: RequestInit): Promise<Response> {
	const now = Date.now()
	const timeSinceLastRequest = now - lastRequestTime

	if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
		await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY - timeSinceLastRequest))
	}

	lastRequestTime = Date.now()
	return fetch(url, options)
}

async function makeAppleMusicRequest<T>(endpoint: string, identifier?: string): Promise<T> {
	// Check if we should block this request
	if (identifier && (await rateLimiter.shouldBlock(identifier))) {
		throw new Error('Request blocked due to rate limiting')
	}

	const url = `${APPLE_MUSIC_API_BASE}${endpoint}`
	const headers = getAppleMusicHeaders()

	console.log('Making Apple Music API request:', {
		url,
		headers: {
			...headers,
			Authorization: headers.Authorization ? 'Bearer [TOKEN]' : 'Missing'
		}
	})

	try {
		const response = await rateLimitedFetch(url, { headers })

		if (!response.ok) {
			const errorText = await response.text()
			console.error('Apple Music API error response:', {
				status: response.status,
				statusText: response.statusText,
				body: errorText
			})

			// Record failure and handle rate limiting
			if (identifier) {
				await rateLimiter.recordFailure(identifier, response.status === 429)
			}

			try {
				const errorData = JSON.parse(errorText)
				if (isAppleMusicError(errorData)) {
					throw new Error(
						`Apple Music API Error: ${errorData.errors[0]?.detail || 'Unknown error'}`
					)
				}
			} catch (e) {
				// If not JSON, throw the text error
			}

			throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`)
		}

		// Record success
		if (identifier) {
			await rateLimiter.recordSuccess(identifier)
		}

		return await response.json()
	} catch (error) {
		console.error('Apple Music API request failed:', error)
		throw error
	}
}

export async function searchAlbums(
	query: string,
	limit: number = 10,
	storefront: string = DEFAULT_STOREFRONT
): Promise<AppleMusicSearchResponse> {
	const encodedQuery = encodeURIComponent(query)
	const endpoint = `/catalog/${storefront}/search?types=albums&term=${encodedQuery}&limit=${limit}`

	return makeAppleMusicRequest<AppleMusicSearchResponse>(endpoint, query)
}

export async function searchTracks(
	query: string,
	limit: number = 10
): Promise<AppleMusicSearchResponse> {
	const encodedQuery = encodeURIComponent(query)
	const endpoint = `/catalog/${DEFAULT_STOREFRONT}/search?types=songs&term=${encodedQuery}&limit=${limit}`

	return makeAppleMusicRequest<AppleMusicSearchResponse>(endpoint, query)
}

export async function getAlbum(id: string): Promise<{ data: AppleMusicAlbum[] }> {
	const endpoint = `/catalog/${DEFAULT_STOREFRONT}/albums/${id}`
	return makeAppleMusicRequest<{ data: AppleMusicAlbum[] }>(endpoint, `album:${id}`)
}

export async function getAlbumWithTracks(id: string): Promise<{ data: AppleMusicAlbum[] }> {
	const endpoint = `/catalog/${DEFAULT_STOREFRONT}/albums/${id}?include=tracks`
	return makeAppleMusicRequest<{ data: AppleMusicAlbum[] }>(endpoint, `album:${id}`)
}

// Get album with all details including tracks for preview URLs
export async function getAlbumDetails(id: string): Promise<AppleMusicAlbum | null> {
	try {
		const endpoint = `/catalog/${DEFAULT_STOREFRONT}/albums/${id}?include=tracks`
		const response = await makeAppleMusicRequest<{
			data: AppleMusicAlbum[]
			included?: AppleMusicTrack[]
		}>(endpoint, `album:${id}`)

		console.log(`Album details for ${id}:`, {
			hasData: !!response.data?.[0],
			hasRelationships: !!response.data?.[0]?.relationships,
			hasTracks: !!response.data?.[0]?.relationships?.tracks,
			hasIncluded: !!response.included,
			includedCount: response.included?.length || 0
		})

		// Check if tracks are in the included array
		if (response.included?.length) {
			console.log('First included track:', JSON.stringify(response.included[0], null, 2))
		}

		return response.data?.[0] || null
	} catch (error) {
		console.error(`Failed to get album details for ID ${id}:`, error)
		return null
	}
}

export async function getTrack(id: string): Promise<{ data: AppleMusicTrack[] }> {
	const endpoint = `/catalog/${DEFAULT_STOREFRONT}/songs/${id}`
	return makeAppleMusicRequest<{ data: AppleMusicTrack[] }>(endpoint, `track:${id}`)
}

// Helper function to search for an album by artist and album name
export async function findAlbum(artist: string, album: string): Promise<AppleMusicAlbum | null> {
	const identifier = `${artist}:${album}`

	// Check if this album was already marked as not found
	if (await rateLimiter.isNotFoundCached(identifier)) {
		console.log(`Album "${album}" by "${artist}" is cached as not found`)
		return null
	}

	// Helper function to remove leading punctuation
	function removeLeadingPunctuation(str: string): string {
		// Remove leading punctuation marks like ; ! ? . , : ' " etc.
		return str.replace(/^[^\w\s]+/, '').trim()
	}

	// Helper function to perform the album search and matching
	async function searchAndMatch(searchAlbum: string, storefront: string = DEFAULT_STOREFRONT): Promise<{album: AppleMusicAlbum, storefront: string} | null> {
		const searchQuery = `${artist} ${searchAlbum}`
		const response = await searchAlbums(searchQuery, 5, storefront)

		console.log(`Search results for "${searchQuery}" in ${storefront} storefront:`, JSON.stringify(response, null, 2))

		if (!response.results?.albums?.data?.length) {
			console.log(`No albums found in ${storefront} storefront`)
			return null
		}

		// Try to find the best match
		const albums = response.results.albums.data
		console.log(`Found ${albums.length} albums`)

		// First try exact match with original album name
		let match = albums.find(
			(a) =>
				a.attributes?.name?.toLowerCase() === album.toLowerCase() &&
				a.attributes?.artistName?.toLowerCase() === artist.toLowerCase()
		)

		// If no exact match, try matching with the search term we used
		if (!match && searchAlbum !== album) {
			match = albums.find(
				(a) =>
					a.attributes?.name?.toLowerCase() === searchAlbum.toLowerCase() &&
					a.attributes?.artistName?.toLowerCase() === artist.toLowerCase()
			)
		}

		// If no exact match, try partial match
		if (!match) {
			match = albums.find(
				(a) =>
					a.attributes?.name?.toLowerCase().includes(searchAlbum.toLowerCase()) &&
					a.attributes?.artistName?.toLowerCase().includes(artist.toLowerCase())
			)
		}

		return match ? {album: match, storefront} : null
	}

	try {
		// First try with the original album name in US storefront
		let result = await searchAndMatch(album)

		// If no match, try Japanese storefront
		if (!result) {
			console.log(`No match found in US storefront, trying Japanese storefront`)
			result = await searchAndMatch(album, JAPANESE_STOREFRONT)
		}

		// If no match and album starts with punctuation, try without it in both storefronts
		if (!result) {
			const cleanedAlbum = removeLeadingPunctuation(album)
			if (cleanedAlbum !== album && cleanedAlbum.length > 0) {
				console.log(`No match found for "${album}", trying without leading punctuation: "${cleanedAlbum}"`)
				result = await searchAndMatch(cleanedAlbum)
				
				// Also try Japanese storefront with cleaned album name
				if (!result) {
					console.log(`Still no match, trying Japanese storefront with cleaned name`)
					result = await searchAndMatch(cleanedAlbum, JAPANESE_STOREFRONT)
				}
			}
		}

		// If still no match, cache as not found
		if (!result) {
			await rateLimiter.cacheNotFound(identifier, 3600)
			return null
		}

		// Store the storefront information with the album
		const matchedAlbum = result.album as any
		matchedAlbum._storefront = result.storefront
		
		// Return the match
		return result.album
	} catch (error) {
		console.error(`Failed to find album "${album}" by "${artist}":`, error)
		// Don't cache as not found on error - might be temporary
		return null
	}
}

// Transform Apple Music album data to match existing format
export async function transformAlbumData(appleMusicAlbum: AppleMusicAlbum) {
	const attributes = appleMusicAlbum.attributes

	// Get preview URL from tracks if album doesn't have one
	let previewUrl = attributes.previews?.[0]?.url
	let tracks: Array<{ name: string; previewUrl?: string; durationMs?: number }> = []

	// Always fetch tracks to get preview URLs
	if (appleMusicAlbum.id) {
		try {
			// Determine which storefront to use
			const storefront = (appleMusicAlbum as any)._storefront || DEFAULT_STOREFRONT
			
			// Fetch album details with tracks
			const endpoint = `/catalog/${storefront}/albums/${appleMusicAlbum.id}?include=tracks`
			const response = await makeAppleMusicRequest<{
				data: AppleMusicAlbum[]
				included?: AppleMusicTrack[]
			}>(endpoint, `album:${appleMusicAlbum.id}`)

			console.log(`Album details response structure:`, {
				hasData: !!response.data,
				dataLength: response.data?.length,
				hasIncluded: !!response.included,
				includedLength: response.included?.length,
				// Check if tracks are in relationships
				hasRelationships: !!response.data?.[0]?.relationships,
				hasTracks: !!response.data?.[0]?.relationships?.tracks
			})

			// Tracks are in relationships.tracks.data when using ?include=tracks
			const albumData = response.data?.[0]
			const tracksData = albumData?.relationships?.tracks?.data

			if (tracksData?.length) {
				console.log(`Found ${tracksData.length} tracks for album "${attributes.name}"`)

				// Process all tracks
				tracks = tracksData
					.filter((item: any) => item.type === 'songs')
					.map((track: any) => ({
						name: track.attributes?.name || 'Unknown',
						previewUrl: track.attributes?.previews?.[0]?.url,
						durationMs: track.attributes?.durationInMillis
					}))

				// Log track details
				tracks.forEach((track, index) => {
					console.log(
						`Track ${index + 1}: ${track.name} - Preview: ${track.previewUrl ? 'Yes' : 'No'} - Duration: ${track.durationMs}ms`
					)
				})

				// Find the first track with a preview if we don't have one
				if (!previewUrl) {
					for (const track of tracksData) {
						if (track.type === 'songs' && track.attributes?.previews?.[0]?.url) {
							previewUrl = track.attributes.previews[0].url
							console.log(`Using preview URL from track "${track.attributes.name}"`)
							break
						}
					}
				}
			} else {
				console.log('No tracks found in album response')
			}
		} catch (error) {
			console.error('Failed to fetch album tracks:', error)
		}
	}

	return {
		appleMusicId: appleMusicAlbum.id,
		highResArtwork: attributes.artwork
			? attributes.artwork.url.replace('{w}x{h}', '3000x3000')
			: undefined,
		previewUrl,
		// Store additional metadata for future use
		genres: attributes.genreNames,
		releaseDate: attributes.releaseDate,
		trackCount: attributes.trackCount,
		recordLabel: attributes.recordLabel,
		copyright: attributes.copyright,
		editorialNotes: attributes.editorialNotes,
		isComplete: attributes.isComplete,
		tracks
	}
}
