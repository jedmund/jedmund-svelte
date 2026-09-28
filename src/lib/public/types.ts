export interface PublicAlbum {
	id: number
	slug: string
	title: string
	description: string | null
	date: string | null
	location: string | null
	photoCount: number
	coverPhoto: {
		id: number
		url: string
		thumbnailUrl: string | null
		width: number | null
		height: number | null
		dominantColor: string | null
		colors: unknown
		aspectRatio: number | null
		caption: string | null
	} | null
	hasContent: boolean
}
