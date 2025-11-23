import { getAppleMusicHeaders } from './apple-music-auth'
import type {
	AppleMusicAlbum,
	AppleMusicTrack,
	AppleMusicSearchResponse
} from '$lib/types/apple-music'
import { isAppleMusicError } from '$lib/types/apple-music'
import { ApiRateLimiter } from './rate-limiter'
import { logger } from './logger'

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

	logger.music('debug', 'Making Apple Music API request:', {
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
			logger.error(
				'Apple Music API error response:',
				undefined,
				{
					status: response.status,
					statusText: response.statusText,
					body: errorText
				},
				'music'
			)

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
			} catch (_e) {
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
		logger.error('Apple Music API request failed:', error as Error, undefined, 'music')
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

// Search for both albums and songs
export async function searchAlbumsAndSongs(
	query: string,
	limit: number = 10,
	storefront: string = DEFAULT_STOREFRONT
): Promise<AppleMusicSearchResponse> {
	const encodedQuery = encodeURIComponent(query)
	const endpoint = `/catalog/${storefront}/search?types=albums,songs&term=${encodedQuery}&limit=${limit}`

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

		return response.data?.[0] || null
	} catch (error) {
		logger.error(`Failed to get album details for ID ${id}:`, error as Error, undefined, 'music')
		return null
	}
}

export async function getTrack(id: string): Promise<{ data: AppleMusicTrack[] }> {
	const endpoint = `/catalog/${DEFAULT_STOREFRONT}/songs/${id}`
	return makeAppleMusicRequest<{ data: AppleMusicTrack[] }>(endpoint, `track:${id}`)
}

// Helper function to detect if a string contains Japanese characters
function containsJapanese(str: string): boolean {
	// Check for Hiragana, Katakana, and Kanji
	return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(str)
}

// Helper function to search for an album by artist and album name
export async function findAlbum(artist: string, album: string): Promise<AppleMusicAlbum | null> {
	const identifier = `${artist}:${album}`
	
	logger.music('info', `=== SEARCHING FOR ALBUM: "${album}" by "${artist}" ===`)

	// Check if this album was already marked as not found
	if (await rateLimiter.isNotFoundCached(identifier)) {
		logger.music('debug', `Album "${album}" by "${artist}" is cached as not found`)
		return null
	}

	// Helper function to remove leading punctuation
	function removeLeadingPunctuation(str: string): string {
		// Remove leading punctuation marks like ; ! ? . , : ' " etc.
		return str.replace(/^[^\w\s]+/, '').trim()
	}

	// Determine primary storefront based on content
	const hasJapaneseContent = containsJapanese(album) || containsJapanese(artist)
	const primaryStorefront = hasJapaneseContent ? JAPANESE_STOREFRONT : DEFAULT_STOREFRONT
	const secondaryStorefront = hasJapaneseContent ? DEFAULT_STOREFRONT : JAPANESE_STOREFRONT

	logger.music('debug', `Album search strategy for "${album}" by "${artist}":`, {
		hasJapaneseContent,
		primaryStorefront,
		secondaryStorefront,
		albumHasJapanese: containsJapanese(album),
		artistHasJapanese: containsJapanese(artist)
	})

	// Helper function to perform the album search and matching
	async function searchAndMatch(
		searchAlbum: string,
		storefront: string = DEFAULT_STOREFRONT
	): Promise<{ album: AppleMusicAlbum; storefront: string } | null> {
		const searchQuery = `${artist} ${searchAlbum}`
		const response = await searchAlbums(searchQuery, 5, storefront)

		logger.music('debug', `Search results for "${searchQuery}" in ${storefront} storefront:`, {
			response
		})

		if (!response.results?.albums?.data?.length) {
			logger.music('debug', `No albums found in ${storefront} storefront`)
			return null
		}

		// Try to find the best match
		const albums = response.results.albums.data
		logger.music('debug', `Found ${albums.length} albums`)

		// Log all album results for debugging
		albums.forEach((a, index) => {
			logger.music(
				'debug',
				`Album ${index + 1}: "${a.attributes?.name}" by "${a.attributes?.artistName}"`,
				{
					id: a.id,
					hasPreview: !!a.attributes?.previews?.[0]?.url
				}
			)
		})

		// Helper function to check if albums match
		const albumsMatch = (albumName: string, searchTerm: string, exact = false): boolean => {
			if (exact) {
				return albumName === searchTerm
			}
			const albumLower = albumName.toLowerCase()
			const searchLower = searchTerm.toLowerCase()
			return (
				albumLower === searchLower ||
				albumLower.startsWith(searchLower) ||
				albumLower.includes(searchLower)
			)
		}

		// Helper function to check if artists match
		const artistsMatch = (artistName: string, searchArtist: string, exact = false): boolean => {
			if (exact) {
				return artistName === searchArtist
			}
			const artistLower = artistName.toLowerCase()
			const searchLower = searchArtist.toLowerCase()

			// Direct match
			if (artistLower === searchLower) return true

			// Handle comma-separated artists
			if (searchArtist.includes(',')) {
				const primaryArtist = searchArtist.split(',')[0].trim().toLowerCase()
				if (artistLower === primaryArtist || artistLower.includes(primaryArtist)) return true
			}

			// Reverse check - if the found artist is in our search
			return searchLower.includes(artistLower)
		}

		// Try different matching strategies in order of preference
		const match = albums.find((a) => {
			const albumName = a.attributes?.name || ''
			const artistName = a.attributes?.artistName || ''

			// 1. Exact match (case-insensitive)
			if (albumsMatch(albumName, album) && artistsMatch(artistName, artist)) {
				return true
			}

			// 2. For Japanese content, try exact character match
			if (
				hasJapaneseContent &&
				albumsMatch(albumName, album, true) &&
				artistsMatch(artistName, artist, true)
			) {
				return true
			}

			// 3. Try with cleaned album name if different
			if (
				searchAlbum !== album &&
				albumsMatch(albumName, searchAlbum) &&
				artistsMatch(artistName, artist)
			) {
				return true
			}

			// 4. Flexible matching for albums with extra text
			if (albumsMatch(albumName, album) && artistsMatch(artistName, artist)) {
				return true
			}

			return false
		})

		return match ? { album: match, storefront } : null
	}

	try {
		// Try different album variations
		const albumVariations = [album]
		const cleanedAlbum = removeLeadingPunctuation(album)
		if (cleanedAlbum !== album && cleanedAlbum.length > 0) {
			albumVariations.push(cleanedAlbum)
		}

		// Try each variation in both storefronts
		for (const albumVariation of albumVariations) {
			for (const storefront of [primaryStorefront, secondaryStorefront]) {
				logger.music('debug', `Searching for "${albumVariation}" in ${storefront} storefront`)
				const result = await searchAndMatch(albumVariation, storefront)

				if (result) {
					// Store the storefront information with the album
					const matchedAlbum = result.album as any
					matchedAlbum._storefront = result.storefront
					return result.album
				}
			}
		}

		// If no album match found, try searching for it as a single/song
		logger.music('debug', `No album found for "${album}" by "${artist}", trying as single/song`)
		
		for (const storefront of [primaryStorefront, secondaryStorefront]) {
			try {
				const searchQuery = `${artist} ${album}`
				logger.music('debug', `Searching for songs with query: "${searchQuery}" in ${storefront}`)
				const response = await searchAlbumsAndSongs(searchQuery, 5, storefront)
				
				// Check if we found the song
				if (response.results?.songs?.data?.length) {
					const songs = response.results.songs.data
					logger.music('debug', `Found ${songs.length} songs in ${storefront}`)
					
					// Log all songs for debugging
					songs.forEach((s, index) => {
						logger.music('debug', `Song ${index + 1}: "${s.attributes?.name}" by "${s.attributes?.artistName}" on "${s.attributes?.albumName}"`)
					})
					
					// Find matching song
					const matchingSong = songs.find(s => {
						const songName = s.attributes?.name || ''
						const artistName = s.attributes?.artistName || ''
						const albumName = s.attributes?.albumName || ''
						
						// For single/track searches, the "album" parameter from Last.fm might actually be the track name
						// Check if this is our song by comparing against the track name
						const songNameLower = songName.toLowerCase()
						const albumSearchLower = album.toLowerCase()
						const artistNameLower = artistName.toLowerCase()
						const artistSearchLower = artist.toLowerCase()
						
						// Check if the song name matches what we're looking for
						const songMatches = songNameLower === albumSearchLower ||
							songNameLower.includes(albumSearchLower) ||
							albumSearchLower.includes(songNameLower)
						
						// Check if the artist matches (handle spaces in Japanese names)
						const artistNameNormalized = artistNameLower.replace(/\s+/g, '')
						const artistSearchNormalized = artistSearchLower.replace(/\s+/g, '')
						
						const artistMatches = artistNameLower === artistSearchLower ||
							artistNameNormalized === artistSearchNormalized ||
							artistNameLower.includes(artistSearchLower) ||
							artistSearchLower.includes(artistNameLower) ||
							artistNameNormalized.includes(artistSearchNormalized) ||
							artistSearchNormalized.includes(artistNameNormalized)
						
						if (songMatches && artistMatches) {
							logger.music('debug', `Found matching song: "${songName}" by "${artistName}" on album "${albumName}"`)
							return true
						}
						
						return false
					})
					
					if (matchingSong) {
						// Get the album info from the song
						const albumName = matchingSong.attributes?.albumName
						if (albumName) {
							logger.music('debug', `Found as single/song, searching for album: "${albumName}"`)
							
							// Search for the actual album
							const albumResponse = await searchAlbums(`${artist} ${albumName}`, 5, storefront)
							if (albumResponse.results?.albums?.data?.length) {
								const album = albumResponse.results.albums.data[0]
								const matchedAlbum = album as any
								matchedAlbum._storefront = storefront
								return album
							}
						}
						
						// If no album found, create a synthetic album from the song
						logger.music('debug', `Creating synthetic album from single: "${matchingSong.attributes?.name}"`)
						return {
							id: `single-${matchingSong.id}`,
							type: 'albums' as const,
							attributes: {
								name: matchingSong.attributes?.albumName || matchingSong.attributes?.name || album,
								artistName: matchingSong.attributes?.artistName || artist,
								artwork: matchingSong.attributes?.artwork,
								genreNames: matchingSong.attributes?.genreNames,
								releaseDate: matchingSong.attributes?.releaseDate,
								trackCount: 1,
								isSingle: true,
								// Store the song ID so we can fetch it later
								_singleSongId: matchingSong.id,
								_singleSongPreview: matchingSong.attributes?.previews?.[0]?.url
							},
							_storefront: storefront
						} as any
					}
				}
			} catch (error) {
				logger.error(`Failed to search for single "${album}":`, error as Error, undefined, 'music')
			}
		}
		
		// If still no match, cache as not found
		await rateLimiter.cacheNotFound(identifier, 3600)
		return null
	} catch (error) {
		logger.error(
			`Failed to find album "${album}" by "${artist}":`,
			error as Error,
			undefined,
			'music'
		)
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

	// Check if this is a synthetic single album
	if ((attributes as any).isSingle && (attributes as any)._singleSongPreview) {
		logger.music('debug', 'Processing synthetic single album')
		previewUrl = (attributes as any)._singleSongPreview
		tracks = [{
			name: attributes.name,
			previewUrl: (attributes as any)._singleSongPreview,
			durationMs: undefined // We'd need to fetch the song details for duration
		}]
	}
	// Always fetch tracks to get preview URLs
	else if (appleMusicAlbum.id) {
		try {
			// Determine which storefront to use
			const storefront = (appleMusicAlbum as any)._storefront || DEFAULT_STOREFRONT

			// Fetch album details with tracks
			const endpoint = `/catalog/${storefront}/albums/${appleMusicAlbum.id}?include=tracks`
			const response = await makeAppleMusicRequest<{
				data: AppleMusicAlbum[]
				included?: AppleMusicTrack[]
			}>(endpoint, `album:${appleMusicAlbum.id}`)

			// Tracks are in relationships.tracks.data when using ?include=tracks
			const albumData = response.data?.[0]
			const tracksData = albumData?.relationships?.tracks?.data

			if (tracksData?.length) {
				logger.music('debug', `Found ${tracksData.length} tracks for album "${attributes.name}"`)

				// Process all tracks
				tracks = tracksData
					.filter((item: any) => item.type === 'songs')
					.map((track: any) => {
						return {
							name: track.attributes?.name || 'Unknown',
							previewUrl: track.attributes?.previews?.[0]?.url,
							durationMs: track.attributes?.durationInMillis
						}
					})

				// Find the first track with a preview if we don't have one
				if (!previewUrl) {
					const trackWithPreview = tracks.find((t) => t.previewUrl)
					if (trackWithPreview) {
						previewUrl = trackWithPreview.previewUrl
						logger.music('debug', `Using preview URL from track "${trackWithPreview.name}"`)
					}
				}
			} else {
				logger.music('debug', 'No tracks found in album response')
			}
		} catch (error) {
			logger.error('Failed to fetch album tracks:', error as Error, undefined, 'music')
		}
	}

	return {
		appleMusicId: appleMusicAlbum.id,
		highResArtwork: attributes.artwork
			? attributes.artwork.url.replace('{w}x{h}', '3000x3000')
			: undefined,
		previewUrl,
		url: attributes.url,
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
