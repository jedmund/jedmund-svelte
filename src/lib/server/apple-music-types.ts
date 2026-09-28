import type { AppleMusicAlbum } from '$lib/types/apple-music'

// Extended types for Apple Music data with custom metadata
export interface ExtendedAppleMusicAlbum extends AppleMusicAlbum {
	_storefront?: string
}

export interface ExtendedAttributes {
	isSingle?: boolean
	_singleSongId?: string
	_singleSongPreview?: string
	[key: string]: unknown
}

export interface SyntheticAlbum extends Omit<AppleMusicAlbum, 'attributes'> {
	attributes: AppleMusicAlbum['attributes'] & ExtendedAttributes
	_storefront?: string
}
