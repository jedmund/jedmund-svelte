import type { EditorData } from '$lib/types/editor'
import { generateImageGalleryJsonLd } from '$lib/utils/metadata'
export interface AlbumPhoto {
	id: number
	url: string
	caption: string | null
	filename: string
	width: number | null
	height: number | null
}

export interface AlbumData {
	id: number
	slug: string
	title: string
	description: string | null
	content: EditorData | null
	location: string | null
	date: string | null
	createdAt: string
	updatedAt: string
	photos?: AlbumPhoto[]
}

// Generate enhanced JSON-LD for albums with content
export const generateAlbumJsonLd = (album: AlbumData, pageUrl: string) => {
	const baseJsonLd = generateImageGalleryJsonLd({
		name: album.title,
		description: album.description ?? undefined,
		url: pageUrl,
		images:
			album.photos?.map((photo: AlbumPhoto) => ({
				url: photo.url,
				caption: photo.caption ?? undefined
			})) || []
	})

	// Enhance with Article schema if album has composed content
	if (album.content) {
		return {
			'@context': 'https://schema.org',
			'@graph': [
				baseJsonLd,
				{
					'@type': 'Article',
					'@id': `${pageUrl}#article`,
					headline: album.title,
					description: album.description,
					url: pageUrl,
					datePublished: album.date || album.createdAt,
					dateModified: album.updatedAt || album.createdAt,
					author: {
						'@type': 'Person',
						name: 'Justin Edmund',
						url: 'https://jedmund.com'
					},
					publisher: {
						'@type': 'Person',
						name: 'Justin Edmund',
						url: 'https://jedmund.com'
					},
					image: album.photos?.[0]?.url,
					mainEntityOfPage: {
						'@type': 'WebPage',
						'@id': pageUrl
					}
				}
			]
		}
	}

	return baseJsonLd
}
