import { prisma } from '../src/lib/server/database'

async function findImageColors() {
	try {
		console.log('Searching for image with filename: B0000295.jpg\n')

		// Search in Photo table
		console.log('Checking Photo table...')
		const photo = await prisma.photo.findFirst({
			where: {
				filename: 'B0000295.jpg'
			},
			select: {
				id: true,
				filename: true,
				dominantColor: true,
				colors: true,
				url: true,
				thumbnailUrl: true,
				width: true,
				height: true,
				aspectRatio: true
			}
		})

		if (photo) {
			console.log('Found in Photo table:')
			console.log('ID:', photo.id)
			console.log('Filename:', photo.filename)
			console.log('URL:', photo.url)
			console.log('Dominant Color:', photo.dominantColor || 'Not set')
			console.log('Colors:', photo.colors ? JSON.stringify(photo.colors, null, 2) : 'Not set')
			console.log('Dimensions:', photo.width ? `${photo.width}x${photo.height}` : 'Not set')
			console.log('Aspect Ratio:', photo.aspectRatio || 'Not set')
		} else {
			console.log('Not found in Photo table.')
		}

		// Search in Media table
		console.log('\nChecking Media table...')
		const media = await prisma.media.findFirst({
			where: {
				filename: 'B0000295.jpg'
			},
			select: {
				id: true,
				filename: true,
				originalName: true,
				dominantColor: true,
				colors: true,
				url: true,
				thumbnailUrl: true,
				width: true,
				height: true,
				aspectRatio: true,
				mimeType: true,
				size: true
			}
		})

		if (media) {
			console.log('Found in Media table:')
			console.log('ID:', media.id)
			console.log('Filename:', media.filename)
			console.log('Original Name:', media.originalName || 'Not set')
			console.log('URL:', media.url)
			console.log('Dominant Color:', media.dominantColor || 'Not set')
			console.log('Colors:', media.colors ? JSON.stringify(media.colors, null, 2) : 'Not set')
			console.log('Dimensions:', media.width ? `${media.width}x${media.height}` : 'Not set')
			console.log('Aspect Ratio:', media.aspectRatio || 'Not set')
			console.log('MIME Type:', media.mimeType)
			console.log('Size:', media.size, 'bytes')
		} else {
			console.log('Not found in Media table.')
		}

		if (!photo && !media) {
			console.log('\nImage B0000295.jpg not found in either Photo or Media tables.')
		}

	} catch (error) {
		console.error('Error searching for image:', error)
	} finally {
		await prisma.$disconnect()
	}
}

// Run the script
findImageColors()