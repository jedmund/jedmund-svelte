import 'dotenv/config'
import { LastClient } from '@musicorum/lastfm'
import type { RequestHandler } from './$types'
import type { Album, AlbumImages } from '$lib/types/lastfm'
import type { LastfmImage } from '@musicorum/lastfm/dist/types/packages/common'
import { findAlbum, transformAlbumData } from '$lib/server/apple-music-client'
import redis from '../redis-client'
import { logger } from '$lib/server/logger'
import { getConfig } from '$lib/server/config'

const USERNAME = 'jedmund'
const ALBUM_LIMIT = 10

// Store last played tracks with timestamps
interface TrackPlayInfo {
	albumName: string
	trackName: string
	scrobbleTime: Date
	durationMs?: number
}

// Type for Apple Music data
interface AppleMusicTrack {
	name: string
	previewUrl?: string
	durationMs?: number
}

interface AppleMusicData {
	tracks?: AppleMusicTrack[]
	artwork?: {
		url: string
		width: number
		height: number
		bgColor?: string
		textColor1?: string
		textColor2?: string
		textColor3?: string
		textColor4?: string
	}
	previewUrl?: string
	appleMusicUrl?: string
	releaseDate?: string
}

let recentTracks: TrackPlayInfo[] = []

export const GET: RequestHandler = async ({ url }) => {
	const apiKey = await getConfig('lastfm.api_key')
	const client = new LastClient(apiKey || '')
	const testMode = url.searchParams.get('test') === 'nowplaying'

	try {
		const albums = await getRecentAlbums(client, USERNAME, ALBUM_LIMIT, testMode)
		const enrichedAlbums = await Promise.all(
			albums.slice(0, ALBUM_LIMIT).map(async (album) => {
				try {
					return await enrichAlbumWithInfo(client, album)
				} catch (error) {
					if (error instanceof Error && error.message.includes('Album not found')) {
						logger.music('debug', `Skipping album: ${album.name} (Album not found)`)
						return null // Skip the album
					}
					throw error // Re-throw if it's a different error
				}
			})
		)

		const validAlbums = enrichedAlbums.filter((album) => album !== null)
		const albumsWithAppleMusicData = await addAppleMusicDataToAlbums(validAlbums)

		return new Response(JSON.stringify({ albums: albumsWithAppleMusicData }), {
			headers: { 'Content-Type': 'application/json' }
		})
	} catch (error) {
		logger.error('Error fetching album data', error as Error)
		return new Response(JSON.stringify({ error: 'Failed to fetch album data' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		})
	}
}

async function getRecentAlbums(
	client: LastClient,
	username: string,
	limit: number,
	testMode: boolean = false
): Promise<Album[]> {
	const cacheKey = `lastfm:recent:${username}`
	const cached = await redis.get(cacheKey)

	let recentTracksResponse
	if (cached) {
		logger.music('debug', 'Using cached Last.fm recent tracks')
		recentTracksResponse = JSON.parse(cached)
		if (recentTracksResponse.tracks) {
			recentTracksResponse.tracks = recentTracksResponse.tracks.map((track: Record<string, unknown>) => ({
				...track,
				date: track.date ? new Date(track.date as string | number) : undefined
			}))
		}
	} else {
		logger.music('debug', 'Fetching fresh Last.fm recent tracks')
		recentTracksResponse = await client.user.getRecentTracks(username, {
			limit: 50,
			extended: true
		})
		await redis.set(cacheKey, JSON.stringify(recentTracksResponse), 'EX', 30)
	}

	const uniqueAlbums = new Map<string, Album>()
	let nowPlayingTrack: string | undefined
	let isFirstAlbum = true

	recentTracks = []

	for (const track of recentTracksResponse.tracks) {
		if (track.date) {
			recentTracks.push({
				albumName: track.album.name,
				trackName: track.name,
				scrobbleTime: track.date
			})
		}

		if (uniqueAlbums.size >= limit) break

		if (track.nowPlaying && !nowPlayingTrack) {
			nowPlayingTrack = track.name
		}

		const albumKey = `${track.album.mbid || track.album.name}`
		if (!uniqueAlbums.has(albumKey)) {
			const isNowPlaying = (testMode && isFirstAlbum) || track.nowPlaying || false

			uniqueAlbums.set(albumKey, {
				name: track.album.name,
				artist: {
					name: track.artist.name,
					mbid: track.artist.mbid || ''
				},
				playCount: 1,
				images: transformImages(track.images),
				mbid: track.album.mbid || '',
				url: track.url,
				rank: uniqueAlbums.size + 1,
				isNowPlaying: isNowPlaying,
				nowPlayingTrack: isNowPlaying ? track.name : undefined
			})
			isFirstAlbum = false
		} else if (track.nowPlaying) {
			const existingAlbum = uniqueAlbums.get(albumKey)!
			uniqueAlbums.set(albumKey, {
				...existingAlbum,
				isNowPlaying: true,
				nowPlayingTrack: track.name
			})
		}
	}

	return Array.from(uniqueAlbums.values())
}

async function enrichAlbumWithInfo(client: LastClient, album: Album): Promise<Album> {
	const cacheKey = `lastfm:albuminfo:${album.artist.name}:${album.name}`
	const cached = await redis.get(cacheKey)

	if (cached) {
		logger.music('debug', `Using cached album info for "${album.name}"`)
		const albumInfo = JSON.parse(cached)
		return {
			...album,
			url: albumInfo?.url || '',
			images: transformImages(albumInfo?.images || [])
		}
	}

	logger.music('debug', `Fetching fresh album info for "${album.name}"`)
	const albumInfo = await client.album.getInfo(album.name, album.artist.name)
	await redis.set(cacheKey, JSON.stringify(albumInfo), 'EX', 3600)

	return {
		...album,
		url: albumInfo?.url || '',
		images: transformImages(albumInfo?.images || [])
	}
}

async function addAppleMusicDataToAlbums(albums: Album[]): Promise<Album[]> {
	return Promise.all(albums.map(searchAppleMusicForAlbum))
}

async function searchAppleMusicForAlbum(album: Album): Promise<Album> {
	const searchMetadata = {
		searchTime: new Date().toISOString(),
		searchQuery: `${album.artist.name} ${album.name}`,
		artist: album.artist.name,
		album: album.name,
		error: null as string | null
	}

	try {
		const cacheKey = `apple:album:${album.artist.name}:${album.name}`
		const cached = await redis.get(cacheKey)

		if (cached) {
			const cachedData = JSON.parse(cached)
			logger.music('debug', `Using cached data for "${album.name}":`, {
				hasPreview: !!cachedData.previewUrl,
				trackCount: cachedData.tracks?.length || 0
			})

			const updatedAlbum = checkNowPlaying(album, cachedData)

			return {
				...updatedAlbum,
				images: {
					...album.images,
					itunes: cachedData.highResArtwork || album.images.itunes
				},
				appleMusicData: cachedData
			}
		}

		const appleMusicAlbum = await findAlbum(album.artist.name, album.name)

		if (appleMusicAlbum) {
			const transformedData = await transformAlbumData(appleMusicAlbum)

			await redis.set(cacheKey, JSON.stringify(transformedData), 'EX', 86400)

			const updatedAlbum = checkNowPlaying(album, transformedData)

			return {
				...updatedAlbum,
				images: {
					...album.images,
					itunes: transformedData.highResArtwork || album.images.itunes
				},
				appleMusicData: transformedData
			}
		} else {
			searchMetadata.error = 'No matching album found'
			const failedSearchData = {
				searchMetadata,
				notFound: true
			}
			await redis.set(cacheKey, JSON.stringify(failedSearchData), 'EX', 3600)
		}
	} catch (error) {
		searchMetadata.error = error instanceof Error ? error.message : 'Unknown error'
		logger.error(`Failed to fetch Apple Music data for "${album.name}" by "${album.artist.name}"`, error as Error)
		const errorData = {
			searchMetadata,
			error: true
		}
		await redis.set(`apple:album:${album.artist.name}:${album.name}`, JSON.stringify(errorData), 'EX', 1800)
	}

	// Return album with search metadata if Apple Music search fails
	return {
		...album,
		appleMusicData: {
			searchMetadata
		}
	}
}

function transformImages(images: LastfmImage[]): AlbumImages {
	const transformedImages: AlbumImages = {
		small: '',
		medium: '',
		large: '',
		extralarge: '',
		mega: '',
		default: ''
	}

	images.forEach((img) => {
		switch (img.size) {
			case 'small':
				transformedImages.small = img.url
				break
			case 'medium':
				transformedImages.medium = img.url
				break
			case 'large':
				transformedImages.large = img.url
				break
			case 'extralarge':
				transformedImages.extralarge = img.url
				break
			case 'mega':
				transformedImages.mega = img.url
				break
		}
	})

	return transformedImages
}

function checkNowPlaying(album: Album, appleMusicData: AppleMusicData | null): Album {
	if (album.isNowPlaying) {
		return album
	}

	const now = new Date()
	const SCROBBLE_LAG = 3 * 60 * 1000

	for (const trackInfo of recentTracks) {
		if (trackInfo.albumName !== album.name) continue

		const trackData = appleMusicData?.tracks?.find(
			(t) => t.name.toLowerCase() === trackInfo.trackName.toLowerCase()
		)

		if (trackData?.durationMs) {
			const trackEndTime = new Date(
				trackInfo.scrobbleTime.getTime() + trackData.durationMs + SCROBBLE_LAG
			)

			if (now < trackEndTime) {
				logger.music('debug', `Detected now playing: "${trackInfo.trackName}" from "${album.name}"`)
				return {
					...album,
					isNowPlaying: true,
					nowPlayingTrack: trackInfo.trackName
				}
			}
		}
	}

	return album
}
