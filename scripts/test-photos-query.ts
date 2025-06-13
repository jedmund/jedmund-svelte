import { PrismaClient } from '@prisma/client'
import 'dotenv/config'

const prisma = new PrismaClient()

async function testPhotoQueries() {
	console.log('=== Testing Photo Queries ===\n')

	try {
		// Query 1: Count all photos
		const totalPhotos = await prisma.photo.count()
		console.log(`Total photos in database: ${totalPhotos}`)

		// Query 2: Photos with showInPhotos=true and albumId=null
		const photosForDisplay = await prisma.photo.findMany({
			where: {
				showInPhotos: true,
				albumId: null
			},
			select: {
				id: true,
				slug: true,
				filename: true,
				status: true,
				showInPhotos: true,
				albumId: true,
				publishedAt: true,
				createdAt: true
			}
		})

		console.log(`\nPhotos with showInPhotos=true and albumId=null: ${photosForDisplay.length}`)
		photosForDisplay.forEach((photo) => {
			console.log(
				`  - ID: ${photo.id}, Status: ${photo.status}, Slug: ${photo.slug || 'none'}, File: ${photo.filename}`
			)
		})

		// Query 3: Check status distribution
		const statusCounts = await prisma.photo.groupBy({
			by: ['status'],
			where: {
				showInPhotos: true,
				albumId: null
			},
			_count: {
				id: true
			}
		})

		console.log('\nStatus distribution for photos with showInPhotos=true and albumId=null:')
		statusCounts.forEach(({ status, _count }) => {
			console.log(`  - ${status}: ${_count.id}`)
		})

		// Query 4: Published photos that should appear
		const publishedPhotos = await prisma.photo.findMany({
			where: {
				status: 'published',
				showInPhotos: true,
				albumId: null
			}
		})

		console.log(
			`\nPublished photos (status='published', showInPhotos=true, albumId=null): ${publishedPhotos.length}`
		)
		publishedPhotos.forEach((photo) => {
			console.log(`  - ID: ${photo.id}, File: ${photo.filename}, Published: ${photo.publishedAt}`)
		})

		// Query 5: Check if there are any draft photos that might need publishing
		const draftPhotos = await prisma.photo.findMany({
			where: {
				status: 'draft',
				showInPhotos: true,
				albumId: null
			}
		})

		if (draftPhotos.length > 0) {
			console.log(`\n⚠️  Found ${draftPhotos.length} draft photos with showInPhotos=true:`)
			draftPhotos.forEach((photo) => {
				console.log(`  - ID: ${photo.id}, File: ${photo.filename}`)
			})
			console.log('These photos need to be published to appear in the photos page!')
		}

		// Query 6: Check unique statuses in the database
		const uniqueStatuses = await prisma.photo.findMany({
			distinct: ['status'],
			select: {
				status: true
			}
		})

		console.log('\nAll unique status values in the database:')
		uniqueStatuses.forEach(({ status }) => {
			console.log(`  - "${status}"`)
		})
	} catch (error) {
		console.error('Error running queries:', error)
	} finally {
		await prisma.$disconnect()
	}
}

// Run the test
testPhotoQueries()
