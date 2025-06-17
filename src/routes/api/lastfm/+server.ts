import 'dotenv/config'
import { LastClient } from '@musicorum/lastfm'
import type { RequestHandler } from './$types'
import type { Album, AlbumImages } from '$lib/types/lastfm'
import type { LastfmImage } from '@musicorum/lastfm/dist/types/packages/common'
import { findAlbum, transformAlbumData } from '$lib/server/apple-music-client'
import redis from '../redis-client'
import { logger } from '$lib/server/logger'

const LASTFM_API_KEY = process.env.LASTFM_API_KEY
const USERNAME = 'jedmund'
const ALBUM_LIMIT = 10

// Store last played tracks with timestamps
interface TrackPlayInfo {
	albumName: string
	trackName: string
	scrobbleTime: Date
	durationMs?: number
}

let recentTracks: TrackPlayInfo[] = []

export const GET: RequestHandler = async ({ url }) => {
	const client = new LastClient(LASTFM_API_KEY || '')
	const testMode = url.searchParams.get('test') === 'nowplaying'

	try {
		// const albums = await getWeeklyAlbumChart(client, USERNAME)

		const albums = await getRecentAlbums(client, USERNAME, ALBUM_LIMIT, testMode)
		// console.log(albums)
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
		console.error('Error fetching album data:', error)
		return new Response(JSON.stringify({ error: 'Failed to fetch album data' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		})
	}
}

async function getWeeklyAlbumChart(client: LastClient, username: string): Promise<Album[]> {
	const chart = await client.user.getWeeklyAlbumChart(username)
	return chart.albums.map((album) => ({
		...album,
		images: { small: '', medium: '', large: '', extralarge: '', mega: '', default: '' }
	}))
}

async function getRecentAlbums(
	client: LastClient,
	username: string,
	limit: number,
	testMode: boolean = false
): Promise<Album[]> {
	// Check cache for recent tracks
	const cacheKey = `lastfm:recent:${username}`
	const cached = await redis.get(cacheKey)

	let recentTracksResponse
	if (cached) {
		logger.music('debug', 'Using cached Last.fm recent tracks')
		recentTracksResponse = JSON.parse(cached)
		// Convert date strings back to Date objects
		if (recentTracksResponse.tracks) {
			recentTracksResponse.tracks = recentTracksResponse.tracks.map((track: any) => ({
				...track,
				date: track.date ? new Date(track.date) : undefined
			}))
		}
	} else {
		console.log('Fetching fresh Last.fm recent tracks')
		recentTracksResponse = await client.user.getRecentTracks(username, {
			limit: 50,
			extended: true
		})
		// Cache for 30 seconds - reasonable for "recent" data
		await redis.set(cacheKey, JSON.stringify(recentTracksResponse), 'EX', 30)
	}

	const uniqueAlbums = new Map<string, Album>()
	let nowPlayingTrack: string | undefined
	let isFirstAlbum = true

	// Clear old tracks and collect new track play information
	recentTracks = []

	for (const track of recentTracksResponse.tracks) {
		// Store track play information for now playing calculation
		if (track.date) {
			recentTracks.push({
				albumName: track.album.name,
				trackName: track.name,
				scrobbleTime: track.date
			})
		}

		if (uniqueAlbums.size >= limit) break

		// Check if this is the currently playing track
		if (track.nowPlaying && !nowPlayingTrack) {
			nowPlayingTrack = track.name
		}

		const albumKey = `${track.album.mbid || track.album.name}`
		if (!uniqueAlbums.has(albumKey)) {
			// For testing: mark first album as now playing
			const isNowPlaying = testMode && isFirstAlbum ? true : track.nowPlaying || false

			uniqueAlbums.set(albumKey, {
				name: track.album.name,
				artist: {
					name: track.artist.name,
					mbid: track.artist.mbid || ''
				},
				playCount: 1, // This is a placeholder, as we don't have actual play count for recent albums
				images: transformImages(track.images),
				mbid: track.album.mbid || '',
				url: track.url,
				rank: uniqueAlbums.size + 1,
				// Mark if this album contains the now playing track
				isNowPlaying: isNowPlaying,
				nowPlayingTrack: isNowPlaying ? track.name : undefined
			})
			isFirstAlbum = false
		} else if (track.nowPlaying) {
			// If album already exists but this track is now playing, update it
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
	// Check cache for album info
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

	console.log(`Fetching fresh album info for "${album.name}"`)
	const albumInfo = await client.album.getInfo(album.name, album.artist.name)

	// Cache for 1 hour - album info rarely changes
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
	try {
		// Check cache first
		const cacheKey = `apple:album:${album.artist.name}:${album.name}`
		const cached = await redis.get(cacheKey)

		if (cached) {
			const cachedData = JSON.parse(cached)
			logger.music('debug', `Using cached data for "${album.name}":`, {
				hasPreview: !!cachedData.previewUrl,
				trackCount: cachedData.tracks?.length || 0
			})

			// Check if this album is currently playing based on track durations
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

		// Search Apple Music
		const appleMusicAlbum = await findAlbum(album.artist.name, album.name)

		if (appleMusicAlbum) {
			const transformedData = await transformAlbumData(appleMusicAlbum)

			// Cache the result for 24 hours
			await redis.set(cacheKey, JSON.stringify(transformedData), 'EX', 86400)

			// Check if this album is currently playing based on track durations
			const updatedAlbum = checkNowPlaying(album, transformedData)

			return {
				...updatedAlbum,
				images: {
					...album.images,
					itunes: transformedData.highResArtwork || album.images.itunes
				},
				appleMusicData: transformedData
			}
		}
	} catch (error) {
		console.error(
			`Failed to fetch Apple Music data for "${album.name}" by "${album.artist.name}":`,
			error
		)
	}

	// Return album unchanged if Apple Music search fails
	return album
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

function checkNowPlaying(album: Album, appleMusicData: any): Album {
	// Don't override if already marked as now playing by Last.fm
	if (album.isNowPlaying) {
		return album
	}

	// Check if any recent track from this album could still be playing
	const now = new Date()
	const SCROBBLE_LAG = 3 * 60 * 1000 // 3 minutes in milliseconds

	for (const trackInfo of recentTracks) {
		if (trackInfo.albumName !== album.name) continue

		// Find the track duration from Apple Music data
		const trackData = appleMusicData.tracks?.find(
			(t: any) => t.name.toLowerCase() === trackInfo.trackName.toLowerCase()
		)

		if (trackData?.durationMs) {
			// Calculate when the track should end (scrobble time + duration + lag)
			const trackEndTime = new Date(
				trackInfo.scrobbleTime.getTime() + trackData.durationMs + SCROBBLE_LAG
			)

			// If current time is before track end time, it's likely still playing
			if (now < trackEndTime) {
				console.log(`Detected now playing: "${trackInfo.trackName}" from "${album.name}"`, {
					scrobbleTime: trackInfo.scrobbleTime,
					durationMs: trackData.durationMs,
					estimatedEndTime: trackEndTime,
					currentTime: now
				})

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
