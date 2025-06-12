import 'dotenv/config'
import { LastClient } from '@musicorum/lastfm'
import {
	searchItunes,
	ItunesSearchOptions,
	ItunesMedia,
	ItunesEntityMusic
} from 'node-itunes-search'
import type { RequestHandler } from './$types'
import type { Album, AlbumImages } from '$lib/types/lastfm'
import type { LastfmImage } from '@musicorum/lastfm/dist/types/packages/common'

const LASTFM_API_KEY = process.env.LASTFM_API_KEY
const USERNAME = 'jedmund'
const ALBUM_LIMIT = 10

export const GET: RequestHandler = async ({ url }) => {
	const client = new LastClient(LASTFM_API_KEY || '')

	try {
		// const albums = await getWeeklyAlbumChart(client, USERNAME)

		const albums = await getRecentAlbums(client, USERNAME, ALBUM_LIMIT)
		// console.log(albums)
		const enrichedAlbums = await Promise.all(
			albums.slice(0, ALBUM_LIMIT).map(async (album) => {
				try {
					return await enrichAlbumWithInfo(client, album)
				} catch (error) {
					if (error instanceof Error && error.message.includes('Album not found')) {
						console.debug(`Skipping album: ${album.name} (Album not found)`)
						return null // Skip the album
					}
					throw error // Re-throw if it's a different error
				}
			})
		)

		const validAlbums = enrichedAlbums.filter((album) => album !== null)
		const albumsWithItunesArt = await addItunesArtToAlbums(validAlbums)

		return new Response(JSON.stringify({ albums: albumsWithItunesArt }), {
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
	limit: number
): Promise<Album[]> {
	const recentTracks = await client.user.getRecentTracks(username, { limit: 50, extended: true })
	const uniqueAlbums = new Map<string, Album>()

	for (const track of recentTracks.tracks) {
		if (uniqueAlbums.size >= limit) break

		const albumKey = `${track.album.mbid || track.album.name}`
		if (!uniqueAlbums.has(albumKey)) {
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
				rank: uniqueAlbums.size + 1
			})
		}
	}

	return Array.from(uniqueAlbums.values())
}

async function enrichAlbumWithInfo(client: LastClient, album: Album): Promise<Album> {
	const albumInfo = await client.album.getInfo(album.name, album.artist.name)
	return {
		...album,
		url: albumInfo?.url || '',
		images: transformImages(albumInfo?.images || [])
	}
}

async function addItunesArtToAlbums(albums: Album[]): Promise<Album[]> {
	return Promise.all(albums.map(searchItunesForAlbum))
}

async function searchItunesForAlbum(album: Album): Promise<Album> {
	const itunesResult = await searchItunesStores(album.name, album.artist.name)

	if (itunesResult && itunesResult.results.length > 0) {
		const firstResult = itunesResult.results[0]
		album.images.itunes = firstResult.artworkUrl100.replace('100x100', '600x600')
	}

	return album
}

async function searchItunesStores(albumName: string, artistName: string): Promise<any | null> {
	const stores = ['JP', 'US']
	for (const store of stores) {
		const encodedTerm = encodeURIComponent(`${albumName} ${artistName}`)
		const result = await searchItunes(
			new ItunesSearchOptions({
				term: encodedTerm,
				country: store,
				media: ItunesMedia.Music,
				entity: ItunesEntityMusic.Album,
				limit: 1
			})
		)

		if (result.resultCount > 0) return result
	}

	return null
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
