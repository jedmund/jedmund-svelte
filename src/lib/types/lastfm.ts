export interface Artist {
	name: string
	mbid?: string
}

export interface AlbumImages {
	small: string
	medium: string
	large: string
	extralarge: string
	mega: string
	default: string
	itunes?: string
}

export interface Image {
	size: 'small' | 'medium' | 'large' | 'extralarge' | 'mega' | 'itunes'
	url: string
}

export interface Album {
	name: string
	mbid?: string
	artist: Artist
	playCount: number
	url: string
	rank: number
	images: AlbumImages
	isNowPlaying?: boolean
	nowPlayingTrack?: string
	appleMusicData?: {
		appleMusicId?: string
		highResArtwork?: string
		previewUrl?: string
		genres?: string[]
		releaseDate?: string
		trackCount?: number
		recordLabel?: string
		copyright?: string
		editorialNotes?: any
		isComplete?: boolean
		tracks?: Array<{
			name: string
			previewUrl?: string
			durationMs?: number
		}>
	}
}

export interface WeeklyAlbumChart {
	albums: Album[]
	attr: {
		user: string
		from: string
		to: string
	}
}
