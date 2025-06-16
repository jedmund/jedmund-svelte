import Album from './Album.svelte'

// Mock album data
const mockAlbum = {
	name: 'In Rainbows',
	artist: {
		name: 'Radiohead',
		mbid: 'a74b1b7f-71a5-4011-9441-d0b5e4122711'
	},
	playCount: 156,
	url: 'https://www.last.fm/music/Radiohead/In+Rainbows',
	rank: 1,
	images: {
		small:
			'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/85/2e/2b/852e2b6c-93ec-806a-95b2-8f5eda2f775c/22UMGIM18886.rgb.jpg/592x592bb.webp',
		medium:
			'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/85/2e/2b/852e2b6c-93ec-806a-95b2-8f5eda2f775c/22UMGIM18886.rgb.jpg/592x592bb.webp',
		large:
			'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/85/2e/2b/852e2b6c-93ec-806a-95b2-8f5eda2f775c/22UMGIM18886.rgb.jpg/592x592bb.webp',
		extralarge:
			'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/85/2e/2b/852e2b6c-93ec-806a-95b2-8f5eda2f775c/22UMGIM18886.rgb.jpg/592x592bb.webp',
		mega: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/85/2e/2b/852e2b6c-93ec-806a-95b2-8f5eda2f775c/22UMGIM18886.rgb.jpg/592x592bb.webp',
		default:
			'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/85/2e/2b/852e2b6c-93ec-806a-95b2-8f5eda2f775c/22UMGIM18886.rgb.jpg/592x592bb.webp'
	},
	isNowPlaying: false,
	appleMusicData: {
		appleMusicId: '1109714933',
		highResArtwork:
			'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/85/2e/2b/852e2b6c-93ec-806a-95b2-8f5eda2f775c/22UMGIM18886.rgb.jpg/592x592bb.webp',
		previewUrl:
			'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/5c/e8/e3/5ce8e347-3bea-3bb0-0664-a6e1c9125d3a/mzaf_7638610958907470670.plus.aac.p.m4a',
		genres: ['Alternative', 'Music'],
		releaseDate: '2007-10-10',
		trackCount: 10,
		recordLabel: 'XL Recordings'
	}
}

const mockAlbumWithLongName = {
	...mockAlbum,
	name: 'The Rise and Fall of Ziggy Stardust and the Spiders from Mars',
	artist: {
		name: 'David Bowie',
		mbid: '5441c29d-3602-4898-b1a1-b77fa23b8e50'
	},
	nowPlayingTrack: 'Starman (2012 Remaster)',
	isNowPlaying: true
}

const mockAlbumNoPreview = {
	...mockAlbum,
	name: 'Unknown Pleasures',
	artist: {
		name: 'Joy Division',
		mbid: '9e1ff9b2-25fc-4c59-b8e8-8b9d9e3d3a2a'
	},
	appleMusicData: {
		...mockAlbum.appleMusicData,
		previewUrl: undefined
	}
}

const mockAlbumNoArtwork = {
	name: 'Demo Album',
	artist: {
		name: 'Unknown Artist',
		mbid: ''
	},
	playCount: 10,
	url: '#',
	rank: 1,
	images: {
		small: '',
		medium: '',
		large: '',
		extralarge: '',
		mega: '',
		default: ''
	}
}

export default {
	title: 'Components/Album',
	component: Album,
	parameters: {
		docs: {
			description: {
				component: 'Album component displaying album artwork, artist info, and playback controls.'
			}
		},
		layout: 'centered'
	},
	argTypes: {
		album: {
			control: 'object',
			description: 'Album data object'
		},
		albumId: {
			control: 'text',
			description: 'Unique identifier for the album'
		},
		hoveredAlbumId: {
			control: 'text',
			description: 'ID of currently hovered album (for shrink effect)'
		},
		onHover: {
			action: 'hovered',
			description: 'Callback when album is hovered'
		}
	}
}

// Template function to wrap Album in a container
const Template = (args) => ({
	Component: Album,
	props: args
})

export const Default = {
	args: {
		album: mockAlbum
	},
	render: Template,
	decorators: [
		(story) => ({
			Component: story,
			target: document.createElement('div'),
			props: {
				style: 'width: 200px; display: block;'
			}
		})
	]
}

export const NowPlaying = {
	args: {
		album: {
			...mockAlbum,
			isNowPlaying: true,
			nowPlayingTrack: '15 Step'
		}
	},
	render: Template
}

export const NowPlayingLongTrackName = {
	args: {
		album: mockAlbumWithLongName
	},
	render: Template
}

export const WithoutPreview = {
	args: {
		album: mockAlbumNoPreview
	},
	render: Template
}

export const WithoutArtwork = {
	args: {
		album: mockAlbumNoArtwork
	},
	render: Template
}

export const Shrunk = {
	args: {
		album: mockAlbum,
		albumId: 'radiohead-in-rainbows',
		hoveredAlbumId: 'some-other-album'
	},
	render: Template
}

export const Interactive = {
	args: {
		album: mockAlbum
	},
	render: Template,
	parameters: {
		docs: {
			story: {
				inline: false,
				height: '300px'
			}
		}
	}
}
