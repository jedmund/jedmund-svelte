export interface ExifData {
	camera?: string
	lens?: string
	focalLength?: string
	aperture?: string
	shutterSpeed?: string
	iso?: string
	dateTaken?: string
	location?: string
}

export interface Photo {
	id: string
	src: string
	alt: string
	caption?: string
	width: number
	height: number
	exif?: ExifData
}

export interface PhotoAlbum {
	id: string
	slug: string
	title: string
	description?: string
	coverPhoto: Photo
	photos: Photo[]
	createdAt: string
}

export type PhotoItem = Photo | PhotoAlbum

export function isAlbum(item: PhotoItem): item is PhotoAlbum {
	return 'photos' in item && Array.isArray(item.photos)
}
