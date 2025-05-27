import type { PageLoad } from './$types'
import type { PhotoItem } from '$lib/types/photos'

export const load: PageLoad = async () => {
	// Mock data for now - in a real app this would come from an API or CMS
	const photoItems: PhotoItem[] = [
		{
			id: 'photo-1',
			src: 'https://picsum.photos/400/600?random=1',
			alt: 'Mountain landscape at sunset',
			caption: 'A beautiful landscape captured during golden hour',
			width: 400,
			height: 600,
			exif: {
				camera: 'Canon EOS R5',
				lens: '24-70mm f/2.8',
				focalLength: '35mm',
				aperture: 'f/5.6',
				shutterSpeed: '1/250s',
				iso: '100',
				dateTaken: '2024-01-15',
				location: 'Yosemite National Park'
			}
		},
		{
			id: 'album-1',
			title: 'Tokyo Street Photography',
			description: 'A collection of street photography from Tokyo',
			coverPhoto: {
				id: 'album-1-cover',
				src: 'https://picsum.photos/500/400?random=2',
				alt: 'Tokyo street scene',
				width: 500,
				height: 400
			},
			photos: [
				{
					id: 'album-1-1',
					src: 'https://picsum.photos/500/400?random=2',
					alt: 'Tokyo street scene',
					caption: 'Busy intersection in Shibuya',
					width: 500,
					height: 400,
					exif: {
						camera: 'Fujifilm X-T4',
						lens: '23mm f/1.4',
						focalLength: '23mm',
						aperture: 'f/2.8',
						shutterSpeed: '1/60s',
						iso: '800',
						dateTaken: '2024-02-10'
					}
				},
				{
					id: 'album-1-2',
					src: 'https://picsum.photos/600/400?random=25',
					alt: 'Tokyo alley',
					caption: 'Quiet alley in Shinjuku',
					width: 600,
					height: 400
				},
				{
					id: 'album-1-3',
					src: 'https://picsum.photos/500/700?random=26',
					alt: 'Neon signs',
					caption: 'Colorful neon signs in Harajuku',
					width: 500,
					height: 700,
					exif: {
						camera: 'Fujifilm X-T4',
						lens: '56mm f/1.2',
						focalLength: '56mm',
						aperture: 'f/1.8',
						shutterSpeed: '1/30s',
						iso: '1600',
						dateTaken: '2024-02-11'
					}
				}
			],
			createdAt: '2024-02-10'
		},
		{
			id: 'photo-2',
			src: 'https://picsum.photos/300/500?random=4',
			alt: 'Modern building',
			caption: 'Urban architecture study',
			width: 300,
			height: 500,
			exif: {
				camera: 'Sony A7IV',
				lens: '85mm f/1.8',
				focalLength: '85mm',
				aperture: 'f/2.8',
				shutterSpeed: '1/125s',
				iso: '200',
				dateTaken: '2024-01-20'
			}
		},
		{
			id: 'photo-3',
			src: 'https://picsum.photos/600/300?random=5',
			alt: 'Ocean waves',
			caption: 'Minimalist seascape composition',
			width: 600,
			height: 300
		},
		{
			id: 'photo-4',
			src: 'https://picsum.photos/400/500?random=6',
			alt: 'Forest path',
			caption: 'Morning light through the trees',
			width: 400,
			height: 500,
			exif: {
				camera: 'Nikon Z6II',
				lens: '24-120mm f/4',
				focalLength: '50mm',
				aperture: 'f/8',
				shutterSpeed: '1/60s',
				iso: '400',
				dateTaken: '2024-03-05',
				location: 'Redwood National Park'
			}
		},
		{
			id: 'album-2',
			title: 'Portrait Series',
			description: 'A collection of environmental portraits',
			coverPhoto: {
				id: 'album-2-cover',
				src: 'https://picsum.photos/400/600?random=7',
				alt: 'Portrait of a musician',
				width: 400,
				height: 600
			},
			photos: [
				{
					id: 'album-2-1',
					src: 'https://picsum.photos/400/600?random=7',
					alt: 'Portrait of a musician',
					caption: 'Jazz musician in his studio',
					width: 400,
					height: 600,
					exif: {
						camera: 'Canon EOS R6',
						lens: '85mm f/1.2',
						focalLength: '85mm',
						aperture: 'f/1.8',
						shutterSpeed: '1/125s',
						iso: '640',
						dateTaken: '2024-02-20'
					}
				},
				{
					id: 'album-2-2',
					src: 'https://picsum.photos/500/650?random=27',
					alt: 'Artist in gallery',
					caption: 'Painter surrounded by her work',
					width: 500,
					height: 650
				},
				{
					id: 'album-2-3',
					src: 'https://picsum.photos/450/600?random=28',
					alt: 'Chef in kitchen',
					caption: 'Chef preparing for evening service',
					width: 450,
					height: 600
				}
			],
			createdAt: '2024-02-20'
		},
		{
			id: 'photo-5',
			src: 'https://picsum.photos/500/350?random=8',
			alt: 'City skyline',
			caption: 'Downtown at blue hour',
			width: 500,
			height: 350,
			exif: {
				camera: 'Sony A7R V',
				lens: '16-35mm f/2.8',
				focalLength: '24mm',
				aperture: 'f/11',
				shutterSpeed: '8s',
				iso: '100',
				dateTaken: '2024-01-30',
				location: 'San Francisco'
			}
		},
		{
			id: 'photo-6',
			src: 'https://picsum.photos/350/550?random=9',
			alt: 'Vintage motorcycle',
			caption: 'Classic bike restoration project',
			width: 350,
			height: 550
		},
		{
			id: 'photo-7',
			src: 'https://picsum.photos/450/300?random=10',
			alt: 'Coffee and books',
			caption: 'Quiet morning ritual',
			width: 450,
			height: 300,
			exif: {
				camera: 'Fujifilm X100V',
				lens: '23mm f/2',
				focalLength: '23mm',
				aperture: 'f/2.8',
				shutterSpeed: '1/60s',
				iso: '320',
				dateTaken: '2024-03-01'
			}
		},
		{
			id: 'album-3',
			title: 'Nature Macro',
			description: 'Close-up studies of natural details',
			coverPhoto: {
				id: 'album-3-cover',
				src: 'https://picsum.photos/400/400?random=11',
				alt: 'Dewdrop on leaf',
				width: 400,
				height: 400
			},
			photos: [
				{
					id: 'album-3-1',
					src: 'https://picsum.photos/400/400?random=11',
					alt: 'Dewdrop on leaf',
					caption: 'Morning dew captured with macro lens',
					width: 400,
					height: 400,
					exif: {
						camera: 'Canon EOS R5',
						lens: '100mm f/2.8 Macro',
						focalLength: '100mm',
						aperture: 'f/5.6',
						shutterSpeed: '1/250s',
						iso: '200',
						dateTaken: '2024-03-15'
					}
				},
				{
					id: 'album-3-2',
					src: 'https://picsum.photos/500/500?random=29',
					alt: 'Butterfly wing detail',
					caption: 'Intricate patterns on butterfly wing',
					width: 500,
					height: 500
				},
				{
					id: 'album-3-3',
					src: 'https://picsum.photos/400/600?random=30',
					alt: 'Tree bark texture',
					caption: 'Ancient oak bark patterns',
					width: 400,
					height: 600
				},
				{
					id: 'album-3-4',
					src: 'https://picsum.photos/350/500?random=31',
					alt: 'Flower stamen',
					caption: 'Lily stamen in soft light',
					width: 350,
					height: 500
				}
			],
			createdAt: '2024-03-15'
		},
		{
			id: 'photo-8',
			src: 'https://picsum.photos/600/400?random=12',
			alt: 'Desert landscape',
			caption: 'Vast desert under starry sky',
			width: 600,
			height: 400,
			exif: {
				camera: 'Nikon D850',
				lens: '14-24mm f/2.8',
				focalLength: '14mm',
				aperture: 'f/2.8',
				shutterSpeed: '25s',
				iso: '3200',
				dateTaken: '2024-02-25',
				location: 'Death Valley'
			}
		},
		{
			id: 'photo-9',
			src: 'https://picsum.photos/300/450?random=13',
			alt: 'Vintage camera',
			caption: "My grandfather's Leica",
			width: 300,
			height: 450
		},
		{
			id: 'photo-10',
			src: 'https://picsum.photos/550/350?random=14',
			alt: 'Market scene',
			caption: 'Colorful spices at local market',
			width: 550,
			height: 350,
			exif: {
				camera: 'Fujifilm X-T5',
				lens: '18-55mm f/2.8-4',
				focalLength: '35mm',
				aperture: 'f/4',
				shutterSpeed: '1/125s',
				iso: '800',
				dateTaken: '2024-03-10',
				location: 'Marrakech, Morocco'
			}
		},
		{
			id: 'photo-11',
			src: 'https://picsum.photos/400/600?random=15',
			alt: 'Lighthouse at dawn',
			caption: 'Coastal beacon in morning mist',
			width: 400,
			height: 600,
			exif: {
				camera: 'Sony A7III',
				lens: '70-200mm f/2.8',
				focalLength: '135mm',
				aperture: 'f/8',
				shutterSpeed: '1/200s',
				iso: '400',
				dateTaken: '2024-02-28',
				location: 'Big Sur, California'
			}
		},
		{
			id: 'photo-12',
			src: 'https://picsum.photos/500/300?random=16',
			alt: 'Train station',
			caption: 'Rush hour commuters',
			width: 500,
			height: 300
		},
		{
			id: 'album-4',
			title: 'Black & White',
			description: 'Monochrome photography collection',
			coverPhoto: {
				id: 'album-4-cover',
				src: 'https://picsum.photos/450/600?random=17',
				alt: 'Urban shadows',
				width: 450,
				height: 600
			},
			photos: [
				{
					id: 'album-4-1',
					src: 'https://picsum.photos/450/600?random=17',
					alt: 'Urban shadows',
					caption: 'Dramatic shadows in the financial district',
					width: 450,
					height: 600,
					exif: {
						camera: 'Leica M11 Monochrom',
						lens: '35mm f/1.4',
						focalLength: '35mm',
						aperture: 'f/5.6',
						shutterSpeed: '1/250s',
						iso: '200',
						dateTaken: '2024-03-20'
					}
				},
				{
					id: 'album-4-2',
					src: 'https://picsum.photos/600/400?random=32',
					alt: 'Elderly man reading',
					caption: 'Contemplation in the park',
					width: 600,
					height: 400
				},
				{
					id: 'album-4-3',
					src: 'https://picsum.photos/400/500?random=33',
					alt: 'Rain on window',
					caption: 'Storm patterns on glass',
					width: 400,
					height: 500
				}
			],
			createdAt: '2024-03-20'
		},
		{
			id: 'photo-13',
			src: 'https://picsum.photos/350/500?random=18',
			alt: 'Street art mural',
			caption: 'Vibrant wall art in the Mission District',
			width: 350,
			height: 500,
			exif: {
				camera: 'iPhone 15 Pro',
				lens: '24mm f/1.8',
				focalLength: '24mm',
				aperture: 'f/1.8',
				shutterSpeed: '1/120s',
				iso: '64',
				dateTaken: '2024-03-25',
				location: 'San Francisco'
			}
		}
	]

	return {
		photoItems
	}
}
