import type { Prisma } from '@prisma/client'

// Type for photo in album (after transformation from Prisma's photoCaption to caption)
interface AlbumPhoto {
	id: number
	url: string
	thumbnailUrl: string | null
	caption: string | null
	width: number | null
	height: number | null
}

interface Tag {
	id: number
	name: string
	displayName: string
	slug: string
}

export interface UniverseItem {
	id: number
	type: 'post' | 'album' | 'garden'
	slug: string
	title?: string
	content?: Prisma.JsonValue
	publishedAt: string
	createdAt: string

	// Post-specific fields
	postType?: string
	attachments?: Prisma.JsonValue
	featuredImage?: string
	tags?: Tag[]

	// Album-specific fields
	description?: string
	location?: string
	date?: string
	photosCount?: number
	coverPhoto?: AlbumPhoto
	photos?: AlbumPhoto[]
	hasContent?: boolean

	// Garden-specific fields
	category?: string
	creator?: string
	imageUrl?: string
	summary?: string
	rating?: number
	isFavorite?: boolean
	isCurrent?: boolean
}
