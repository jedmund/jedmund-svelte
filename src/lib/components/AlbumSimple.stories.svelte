<script>
	import Album from './Album.svelte'

	const album = {
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
</script>

<div style="width: 200px; padding: 20px; background: #f5f5f5;">
	<Album {album} />
</div>

<style>
	div {
		display: block;
	}
</style>
