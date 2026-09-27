interface Photo {
	id: number
	url: string
	thumbnailUrl: string | null
	caption: string | null
}

export interface Album {
	id: number
	slug: string
	title: string
	description: string | null
	date: string | null
	location: string | null
	coverPhotoId: number | null
	status: string
	showInUniverse: boolean
	publishedAt: string | null
	createdAt: string
	updatedAt: string
	photos: Photo[]
	content?: unknown
	_count: {
		media: number
	}
}
