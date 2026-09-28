import { containsJapanese, albumsMatch, artistsMatch } from './apple-music-matching'
import type {
	AppleMusicAlbum,
	AppleMusicTrack,
	AppleMusicSearchResponse
} from '$lib/types/apple-music'
import type { ExtendedAppleMusicAlbum, SyntheticAlbum } from './apple-music-types'
import { makeAppleMusicRequest, rateLimiter } from './apple-music-transport'
import { logger } from './logger'
const DEFAULT_STOREFRONT = 'us'
const JAPANESE_STOREFRONT = 'jp'

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

		logger.music(
			'debug',
			`Search results for "${searchQuery}" in ${storefront} storefront: ${JSON.stringify(response.results?.albums?.data?.length ?? 0)} albums`
		)

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
					const matchedAlbum = result.album as ExtendedAppleMusicAlbum
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
						logger.music(
							'debug',
							`Song ${index + 1}: "${s.attributes?.name}" by "${s.attributes?.artistName}" on "${s.attributes?.albumName}"`
						)
					})

					// Find matching song
					const matchingSong = songs.find((s) => {
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
						const songMatches =
							songNameLower === albumSearchLower ||
							songNameLower.includes(albumSearchLower) ||
							albumSearchLower.includes(songNameLower)

						// Check if the artist matches (handle spaces in Japanese names)
						const artistNameNormalized = artistNameLower.replace(/\s+/g, '')
						const artistSearchNormalized = artistSearchLower.replace(/\s+/g, '')

						const artistMatches =
							artistNameLower === artistSearchLower ||
							artistNameNormalized === artistSearchNormalized ||
							artistNameLower.includes(artistSearchLower) ||
							artistSearchLower.includes(artistNameLower) ||
							artistNameNormalized.includes(artistSearchNormalized) ||
							artistSearchNormalized.includes(artistNameNormalized)

						if (songMatches && artistMatches) {
							logger.music(
								'debug',
								`Found matching song: "${songName}" by "${artistName}" on album "${albumName}"`
							)
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
								const matchedAlbum = album as ExtendedAppleMusicAlbum
								matchedAlbum._storefront = storefront
								return album
							}
						}

						// If no album found, create a synthetic album from the song
						logger.music(
							'debug',
							`Creating synthetic album from single: "${matchingSong.attributes?.name}"`
						)
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
						} as SyntheticAlbum
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
