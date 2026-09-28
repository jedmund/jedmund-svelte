import type { AppleMusicAlbum, AppleMusicTrack } from '$lib/types/apple-music'
import type {
	ExtendedAppleMusicAlbum,
	ExtendedAttributes,
	SyntheticAlbum
} from './apple-music-types'
import { makeAppleMusicRequest } from './apple-music-transport'
import { logger } from './logger'
const DEFAULT_STOREFRONT = 'us'

// Transform Apple Music album data to match existing format
export async function transformAlbumData(appleMusicAlbum: AppleMusicAlbum | SyntheticAlbum) {
	const attributes = appleMusicAlbum.attributes

	// Get preview URL from tracks if album doesn't have one
	let previewUrl = attributes.previews?.[0]?.url
	let tracks: Array<{ name: string; previewUrl?: string; durationMs?: number }> = []

	// Check if this is a synthetic single album
	const extendedAttrs = attributes as ExtendedAttributes
	if (extendedAttrs.isSingle && extendedAttrs._singleSongPreview) {
		logger.music('debug', 'Processing synthetic single album')
		previewUrl = extendedAttrs._singleSongPreview
		tracks = [
			{
				name: attributes.name,
				previewUrl: extendedAttrs._singleSongPreview,
				durationMs: undefined // We'd need to fetch the song details for duration
			}
		]
	}
	// Always fetch tracks to get preview URLs
	else if (appleMusicAlbum.id) {
		try {
			// Determine which storefront to use
			const extendedAlbum = appleMusicAlbum as ExtendedAppleMusicAlbum
			const storefront = extendedAlbum._storefront || DEFAULT_STOREFRONT

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
					.filter((item) => item.type === 'songs')
					.map((track) => {
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
