export interface AppleMusicArtwork {
	width: number
	height: number
	url: string
	bgColor?: string
	textColor1?: string
	textColor2?: string
	textColor3?: string
	textColor4?: string
}

export interface AppleMusicPreview {
	url: string
}

export interface AppleMusicAttributes {
	artistName: string
	artwork: AppleMusicArtwork
	contentRating?: string
	copyright?: string
	editorialNotes?: {
		short?: string
		standard?: string
	}
	genreNames: string[]
	isCompilation: boolean
	isComplete: boolean
	isMasteredForItunes: boolean
	isSingle: boolean
	name: string
	playParams?: {
		id: string
		kind: string
	}
	previews?: AppleMusicPreview[]
	recordLabel?: string
	releaseDate: string
	trackCount: number
	upc?: string
	url: string
}

export interface AppleMusicTrackAttributes {
	albumName: string
	artistName: string
	artwork: AppleMusicArtwork
	composerName?: string
	contentRating?: string
	discNumber: number
	durationInMillis: number
	genreNames: string[]
	hasLyrics: boolean
	isrc?: string
	name: string
	playParams?: {
		id: string
		kind: string
	}
	previews: AppleMusicPreview[]
	releaseDate: string
	trackNumber: number
	url: string
}

export interface AppleMusicRelationships {
	artists?: {
		data: AppleMusicResource<any>[]
		href?: string
		next?: string
	}
	tracks?: {
		data: AppleMusicResource<AppleMusicTrackAttributes>[]
		href?: string
		next?: string
	}
}

export interface AppleMusicResource<T> {
	id: string
	type: string
	href: string
	attributes: T
	relationships?: AppleMusicRelationships
}

export interface AppleMusicAlbum extends AppleMusicResource<AppleMusicAttributes> {
	type: 'albums'
}

export interface AppleMusicTrack extends AppleMusicResource<AppleMusicTrackAttributes> {
	type: 'songs'
}

export interface AppleMusicSearchResponse {
	results: {
		albums?: {
			data: AppleMusicAlbum[]
			href?: string
			next?: string
		}
		songs?: {
			data: AppleMusicTrack[]
			href?: string
			next?: string
		}
	}
}

export interface AppleMusicErrorResponse {
	errors: Array<{
		id: string
		title: string
		detail: string
		status: string
		code: string
	}>
}

// Type guards
export function isAppleMusicError(response: any): response is AppleMusicErrorResponse {
	return response && 'errors' in response && Array.isArray(response.errors)
}

export function isAppleMusicAlbum(resource: any): resource is AppleMusicAlbum {
	return resource && resource.type === 'albums' && 'attributes' in resource
}

export function isAppleMusicTrack(resource: any): resource is AppleMusicTrack {
	return resource && resource.type === 'songs' && 'attributes' in resource
}

// Helper function to get high-resolution artwork URL
export function getArtworkUrl(artwork: AppleMusicArtwork, size: number = 3000): string {
	return artwork.url.replace('{w}x{h}', `${size}x${size}`)
}
