import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkPhotosDisplay() {
	try {
		console.log('=== Checking Photos Display ===\n')

		// Check albums marked for photography
		const photographyAlbums = await prisma.album.findMany({
			where: {
				status: 'published',
				isPhotography: true
			},
			include: {
				photos: {
					where: {
						status: 'published'
					}
				}
			}
		})

		console.log(`Found ${photographyAlbums.length} published photography albums:`)
		photographyAlbums.forEach(album => {
			console.log(`- "${album.title}" (${album.slug}): ${album.photos.length} published photos`)
		})

		// Check individual photos marked to show in photos
		const individualPhotos = await prisma.photo.findMany({
			where: {
				status: 'published',
				showInPhotos: true,
				albumId: null
			}
		})

		console.log(`\nFound ${individualPhotos.length} individual photos marked to show in Photos`)
		individualPhotos.forEach(photo => {
			console.log(`- Photo ID ${photo.id}: ${photo.filename}`)
		})

		// Check if there are any published photos in albums
		const photosInAlbums = await prisma.photo.findMany({
			where: {
				status: 'published',
				showInPhotos: true,
				albumId: { not: null }
			},
			include: {
				album: true
			}
		})

		console.log(`\nFound ${photosInAlbums.length} published photos in albums with showInPhotos=true`)
		const albumGroups = photosInAlbums.reduce((acc, photo) => {
			const albumTitle = photo.album?.title || 'Unknown'
			acc[albumTitle] = (acc[albumTitle] || 0) + 1
			return acc
		}, {} as Record<string, number>)

		Object.entries(albumGroups).forEach(([album, count]) => {
			console.log(`- Album "${album}": ${count} photos`)
		})

		// Check media marked as photography
		const photographyMedia = await prisma.media.findMany({
			where: {
				isPhotography: true
			}
		})

		console.log(`\nFound ${photographyMedia.length} media items marked as photography`)

		// Check for any photos regardless of status
		const allPhotos = await prisma.photo.findMany({
			include: {
				album: true
			}
		})

		console.log(`\nTotal photos in database: ${allPhotos.length}`)
		const statusCounts = allPhotos.reduce((acc, photo) => {
			acc[photo.status] = (acc[photo.status] || 0) + 1
			return acc
		}, {} as Record<string, number>)

		Object.entries(statusCounts).forEach(([status, count]) => {
			console.log(`- Status "${status}": ${count} photos`)
		})

		// Check all albums
		const allAlbums = await prisma.album.findMany({
			include: {
				_count: {
					select: { photos: true }
				}
			}
		})

		console.log(`\nTotal albums in database: ${allAlbums.length}`)
		allAlbums.forEach(album => {
			console.log(`- "${album.title}" (${album.slug}): status=${album.status}, isPhotography=${album.isPhotography}, photos=${album._count.photos}`)
		})

	} catch (error) {
		console.error('Error checking photos:', error)
	} finally {
		await prisma.$disconnect()
	}
}

checkPhotosDisplay()