import type { Album, AlbumImages } from '$lib/types/lastfm'
import type { LastfmImage } from '@musicorum/lastfm/dist/types/packages/common'

/**
 * Transform Last.fm image array into structured AlbumImages object
 */
export function transformImages(images: LastfmImage[]): AlbumImages {
	const imageMap: AlbumImages = {
		small: '',
		medium: '',
		large: '',
		extralarge: '',
		mega: '',
		default: ''
	}

	for (const image of images) {
		const size = image.size as keyof AlbumImages
		if (size in imageMap) {
			imageMap[size] = image.url
		}
	}

	// Set default to the largest available image
	imageMap.default = imageMap.mega || imageMap.extralarge || imageMap.large || imageMap.medium || imageMap.small || ''

	return imageMap
}

/**
 * Create a unique key for an album
 */
export function getAlbumKey(artistName: string, albumName: string): string {
	return `${artistName}:${albumName}`
}

/**
 * Transform track data into an Album object
 */
export function trackToAlbum(track: any, rank: number): Album {
	return {
		name: track.album.name,
		artist: {
			name: track.artist.name,
			mbid: track.artist.mbid || ''
		},
		playCount: 1,
		images: transformImages(track.images),
		mbid: track.album.mbid || '',
		url: track.url,
		rank,
		isNowPlaying: track.nowPlaying || false,
		nowPlayingTrack: track.nowPlaying ? track.name : undefined
	}
}

/**
 * Merge Apple Music data into an Album
 */
export function mergeAppleMusicData(album: Album, appleMusicData: any): Album {
	return {
		...album,
		images: {
			...album.images,
			itunes: appleMusicData.highResArtwork || album.images.itunes
		},
		appleMusicData
	}
}