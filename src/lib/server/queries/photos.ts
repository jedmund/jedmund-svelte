import type { Prisma } from '@prisma/client'
import { prisma } from '$lib/server/database'
import type { Photo } from '$lib/types/photos'

export const PHOTO_MEDIA_SELECT = {
	id: true,
	photoSlug: true,
	filename: true,
	url: true,
	thumbnailUrl: true,
	width: true,
	height: true,
	dominantColor: true,
	colors: true,
	aspectRatio: true,
	photoCaption: true,
	photoTitle: true,
	photoDescription: true,
	createdAt: true,
	photoPublishedAt: true,
	exifData: true
} satisfies Prisma.MediaSelect

export type PhotoMedia = Prisma.MediaGetPayload<{ select: typeof PHOTO_MEDIA_SELECT }>

export async function getPhotographyMedia() {
	return prisma.media.findMany({
		where: { isPhotography: true },
		select: PHOTO_MEDIA_SELECT,
		orderBy: [{ photoPublishedAt: 'desc' }, { createdAt: 'desc' }]
	})
}

function getPhotoDate(media: PhotoMedia): Date {
	if (media.exifData && typeof media.exifData === 'object') {
		const exif = media.exifData as Record<string, unknown>
		const dateTaken = exif.DateTimeOriginal || exif.DateTime || exif.dateTaken
		if (dateTaken && typeof dateTaken === 'string') {
			const parsed = new Date(dateTaken.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3'))
			if (!isNaN(parsed.getTime())) return parsed
		}
	}
	if (media.photoPublishedAt) return new Date(media.photoPublishedAt)
	return new Date(media.createdAt)
}

export function toPhoto(media: PhotoMedia): Photo {
	return {
		id: `media-${media.id}`,
		src: media.url,
		alt: media.photoTitle || media.photoCaption || media.filename,
		caption: media.photoCaption || undefined,
		width: media.width || 400,
		height: media.height || 400,
		dominantColor: media.dominantColor || undefined,
		colors: (media.colors as Photo['colors']) || undefined,
		aspectRatio: media.aspectRatio || undefined,
		createdAt: getPhotoDate(media).toISOString()
	}
}

interface ListParams {
	limit?: number
	offset?: number
}

// Sorts by EXIF date server-side, which means we need the full set before
// paginating. Acceptable for the current dataset size.
export async function getPaginatedPhotos({ limit = 50, offset = 0 }: ListParams = {}) {
	const media = await getPhotographyMedia()
	const photos = media.map(toPhoto).sort((a, b) => {
		const da = new Date(a.createdAt || 0).getTime()
		const db = new Date(b.createdAt || 0).getTime()
		return db - da
	})
	return {
		photos: photos.slice(offset, offset + limit),
		total: photos.length
	}
}
