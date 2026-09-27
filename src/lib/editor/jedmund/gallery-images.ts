import type { Media } from '@prisma/client'

export interface GalleryImage {
	id: number | string
	url: string
	alt?: string
	title?: string
	[key: string]: unknown
}

/** Keep authored metadata when an existing gallery image is selected again. */
export function galleryImagesFromMedia(
	media: Pick<Media, 'id' | 'url' | 'description'>[],
	previous: GalleryImage[] = []
): GalleryImage[] {
	return media.map((item) => {
		const existing = previous.find((image) => String(image.id) === String(item.id))
		return {
			alt: item.description || '',
			title: '',
			...existing,
			id: item.id,
			url: item.url
		}
	})
}
