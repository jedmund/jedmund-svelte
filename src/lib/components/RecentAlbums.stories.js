import RecentAlbums from './RecentAlbums.svelte'

// Mock albums data
const mockAlbums = [
	{
		name: 'In Rainbows',
		artist: {
			name: 'Radiohead',
			mbid: 'a74b1b7f-71a5-4011-9441-d0b5e4122711'
		},
		playCount: 156,
		url: 'https://www.last.fm/music/Radiohead/In+Rainbows',
		rank: 1,
		images: {
			small: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/85/2e/2b/852e2b6c-93ec-806a-95b2-8f5eda2f775c/22UMGIM18886.rgb.jpg/592x592bb.webp',
			medium: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/85/2e/2b/852e2b6c-93ec-806a-95b2-8f5eda2f775c/22UMGIM18886.rgb.jpg/592x592bb.webp',
			large: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/85/2e/2b/852e2b6c-93ec-806a-95b2-8f5eda2f775c/22UMGIM18886.rgb.jpg/592x592bb.webp',
			extralarge: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/85/2e/2b/852e2b6c-93ec-806a-95b2-8f5eda2f775c/22UMGIM18886.rgb.jpg/592x592bb.webp',
			mega: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/85/2e/2b/852e2b6c-93ec-806a-95b2-8f5eda2f775c/22UMGIM18886.rgb.jpg/592x592bb.webp',
			default: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/85/2e/2b/852e2b6c-93ec-806a-95b2-8f5eda2f775c/22UMGIM18886.rgb.jpg/592x592bb.webp'
		},
		isNowPlaying: false,
		appleMusicData: {
			appleMusicId: '1109714933',
			highResArtwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/85/2e/2b/852e2b6c-93ec-806a-95b2-8f5eda2f775c/22UMGIM18886.rgb.jpg/592x592bb.webp',
			previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/5c/e8/e3/5ce8e347-3bea-3bb0-0664-a6e1c9125d3a/mzaf_7638610958907470670.plus.aac.p.m4a',
			genres: ['Alternative', 'Music'],
			releaseDate: '2007-10-10',
			trackCount: 10,
			recordLabel: 'XL Recordings'
		}
	},
	{
		name: 'OK Computer',
		artist: {
			name: 'Radiohead',
			mbid: 'a74b1b7f-71a5-4011-9441-d0b5e4122711'
		},
		playCount: 234,
		url: 'https://www.last.fm/music/Radiohead/OK+Computer',
		rank: 2,
		images: {
			small: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/85/2e/2b/852e2b6c-93ec-806a-95b2-8f5eda2f775c/22UMGIM18886.rgb.jpg/592x592bb.webp',
			medium: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/85/2e/2b/852e2b6c-93ec-806a-95b2-8f5eda2f775c/22UMGIM18886.rgb.jpg/592x592bb.webp',
			large: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/85/2e/2b/852e2b6c-93ec-806a-95b2-8f5eda2f775c/22UMGIM18886.rgb.jpg/592x592bb.webp',
			extralarge: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/85/2e/2b/852e2b6c-93ec-806a-95b2-8f5eda2f775c/22UMGIM18886.rgb.jpg/592x592bb.webp',
			mega: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/85/2e/2b/852e2b6c-93ec-806a-95b2-8f5eda2f775c/22UMGIM18886.rgb.jpg/592x592bb.webp',
			default: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/85/2e/2b/852e2b6c-93ec-806a-95b2-8f5eda2f775c/22UMGIM18886.rgb.jpg/592x592bb.webp'
		},
		isNowPlaying: true,
		nowPlayingTrack: 'Paranoid Android',
		appleMusicData: {
			appleMusicId: '1097861387',
			highResArtwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/85/2e/2b/852e2b6c-93ec-806a-95b2-8f5eda2f775c/22UMGIM18886.rgb.jpg/592x592bb.webp',
			previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/65/f2/85/65f285d2-5a99-f502-89f8-ca2c4da24d19/mzaf_1760708625972666865.plus.aac.p.m4a'
		}
	},
	{
		name: 'The Dark Side of the Moon',
		artist: {
			name: 'Pink Floyd',
			mbid: '83d91898-7763-47d7-b03b-b92132375c47'
		},
		playCount: 189,
		url: 'https://www.last.fm/music/Pink+Floyd/The+Dark+Side+of+the+Moon',
		rank: 3,
		images: {
			small: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/85/2e/2b/852e2b6c-93ec-806a-95b2-8f5eda2f775c/22UMGIM18886.rgb.jpg/592x592bb.webp',
			medium: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/85/2e/2b/852e2b6c-93ec-806a-95b2-8f5eda2f775c/22UMGIM18886.rgb.jpg/592x592bb.webp',
			large: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/85/2e/2b/852e2b6c-93ec-806a-95b2-8f5eda2f775c/22UMGIM18886.rgb.jpg/592x592bb.webp',
			extralarge: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/85/2e/2b/852e2b6c-93ec-806a-95b2-8f5eda2f775c/22UMGIM18886.rgb.jpg/592x592bb.webp',
			mega: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/85/2e/2b/852e2b6c-93ec-806a-95b2-8f5eda2f775c/22UMGIM18886.rgb.jpg/592x592bb.webp',
			default: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/85/2e/2b/852e2b6c-93ec-806a-95b2-8f5eda2f775c/22UMGIM18886.rgb.jpg/592x592bb.webp'
		},
		appleMusicData: {
			appleMusicId: '1065973699',
			highResArtwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/85/2e/2b/852e2b6c-93ec-806a-95b2-8f5eda2f775c/22UMGIM18886.rgb.jpg/592x592bb.webp',
			previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/57/15/fb/5715fb67-0424-8e6e-a1ff-2c0cf09e4bdc/mzaf_3641989451682986919.plus.aac.p.m4a'
		}
	},
	{
		name: 'Unknown Pleasures',
		artist: {
			name: 'Joy Division',
			mbid: '9e1ff9b2-25fc-4c59-b8e8-8b9d9e3d3a2a'
		},
		playCount: 112,
		url: 'https://www.last.fm/music/Joy+Division/Unknown+Pleasures',
		rank: 4,
		images: {
			small: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/85/2e/2b/852e2b6c-93ec-806a-95b2-8f5eda2f775c/22UMGIM18886.rgb.jpg/592x592bb.webp',
			medium: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/85/2e/2b/852e2b6c-93ec-806a-95b2-8f5eda2f775c/22UMGIM18886.rgb.jpg/592x592bb.webp',
			large: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/85/2e/2b/852e2b6c-93ec-806a-95b2-8f5eda2f775c/22UMGIM18886.rgb.jpg/592x592bb.webp',
			extralarge: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/85/2e/2b/852e2b6c-93ec-806a-95b2-8f5eda2f775c/22UMGIM18886.rgb.jpg/592x592bb.webp',
			mega: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/85/2e/2b/852e2b6c-93ec-806a-95b2-8f5eda2f775c/22UMGIM18886.rgb.jpg/592x592bb.webp',
			default: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/85/2e/2b/852e2b6c-93ec-806a-95b2-8f5eda2f775c/22UMGIM18886.rgb.jpg/592x592bb.webp'
		},
		appleMusicData: {
			appleMusicId: '659989492',
			highResArtwork: 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/85/2e/2b/852e2b6c-93ec-806a-95b2-8f5eda2f775c/22UMGIM18886.rgb.jpg/592x592bb.webp'
		}
	}
]

const mockAlbumsWithLongNames = [
	{
		...mockAlbums[0],
		name: 'The Rise and Fall of Ziggy Stardust and the Spiders from Mars',
		artist: {
			name: 'David Bowie',
			mbid: '5441c29d-3602-4898-b1a1-b77fa23b8e50'
		},
		isNowPlaying: true,
		nowPlayingTrack: 'Starman (2012 Remaster) - Extended Version with Additional Notes'
	},
	{
		...mockAlbums[1],
		name: '!Despertate!',
		artist: {
			name: '!deladap',
			mbid: ''
		}
	},
	{
		...mockAlbums[2],
		name: ';PEBFG',
		artist: {
			name: 'Various Artists',
			mbid: ''
		}
	},
	mockAlbums[3]
]

export default {
	title: 'Components/RecentAlbums',
	component: RecentAlbums,
	parameters: {
		docs: {
			description: {
				component: 'Displays a grid of recent albums with hover effects and now playing indicators.'
			}
		},
		layout: 'fullscreen'
	},
	argTypes: {
		albums: {
			control: 'object',
			description: 'Array of album objects to display'
		}
	},
	decorators: [
		(Story) => ({
			Component: Story,
			props: {
				style: 'padding: 40px; background: #f9f9f9; min-height: 400px;'
			}
		})
	]
}

export const Default = {
	args: {
		albums: mockAlbums
	}
}

export const WithNowPlaying = {
	args: {
		albums: mockAlbums
	}
}

export const WithLongTitles = {
	args: {
		albums: mockAlbumsWithLongNames
	}
}

export const Empty = {
	args: {
		albums: []
	}
}

export const SingleAlbum = {
	args: {
		albums: [mockAlbums[0]]
	}
}

export const MobileView = {
	args: {
		albums: mockAlbums
	},
	parameters: {
		viewport: {
			defaultViewport: 'mobile1'
		}
	}
}