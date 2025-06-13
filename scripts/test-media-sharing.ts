#!/usr/bin/env tsx
// Test script to verify that Media can be shared across multiple albums

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testMediaSharing() {
	console.log('Testing Media sharing across albums...\n')

	try {
		// 1. Create a test media item
		console.log('1. Creating test media item...')
		const media = await prisma.media.create({
			data: {
				filename: 'test-shared-image.jpg',
				originalName: 'Test Shared Image',
				mimeType: 'image/jpeg',
				size: 1024000,
				url: 'https://example.com/test-shared-image.jpg',
				thumbnailUrl: 'https://example.com/test-shared-image-thumb.jpg',
				width: 1920,
				height: 1080,
				altText: 'A test image that will be shared across albums',
				description: 'This is a test image to verify media sharing',
				isPhotography: true
			}
		})
		console.log(`✓ Created media with ID: ${media.id}\n`)

		// 2. Create two test albums
		console.log('2. Creating test albums...')
		const album1 = await prisma.album.create({
			data: {
				slug: 'test-album-1',
				title: 'Test Album 1',
				description: 'First test album for media sharing',
				status: 'published'
			}
		})
		console.log(`✓ Created album 1 with ID: ${album1.id}`)

		const album2 = await prisma.album.create({
			data: {
				slug: 'test-album-2',
				title: 'Test Album 2',
				description: 'Second test album for media sharing',
				status: 'published'
			}
		})
		console.log(`✓ Created album 2 with ID: ${album2.id}\n`)

		// 3. Add the same media to both albums
		console.log('3. Adding media to both albums...')
		const photo1 = await prisma.photo.create({
			data: {
				albumId: album1.id,
				mediaId: media.id,
				filename: media.filename,
				url: media.url,
				thumbnailUrl: media.thumbnailUrl,
				width: media.width,
				height: media.height,
				caption: 'Same media in album 1',
				displayOrder: 1,
				status: 'published',
				showInPhotos: true
			}
		})
		console.log(`✓ Added photo to album 1 with ID: ${photo1.id}`)

		const photo2 = await prisma.photo.create({
			data: {
				albumId: album2.id,
				mediaId: media.id,
				filename: media.filename,
				url: media.url,
				thumbnailUrl: media.thumbnailUrl,
				width: media.width,
				height: media.height,
				caption: 'Same media in album 2',
				displayOrder: 1,
				status: 'published',
				showInPhotos: true
			}
		})
		console.log(`✓ Added photo to album 2 with ID: ${photo2.id}\n`)

		// 4. Create media usage records
		console.log('4. Creating media usage records...')
		await prisma.mediaUsage.createMany({
			data: [
				{
					mediaId: media.id,
					contentType: 'album',
					contentId: album1.id,
					fieldName: 'photos'
				},
				{
					mediaId: media.id,
					contentType: 'album',
					contentId: album2.id,
					fieldName: 'photos'
				}
			]
		})
		console.log('✓ Created media usage records\n')

		// 5. Verify the media is in both albums
		console.log('5. Verifying media is in both albums...')
		const verifyAlbum1 = await prisma.album.findUnique({
			where: { id: album1.id },
			include: {
				photos: {
					include: {
						media: true
					}
				}
			}
		})

		const verifyAlbum2 = await prisma.album.findUnique({
			where: { id: album2.id },
			include: {
				photos: {
					include: {
						media: true
					}
				}
			}
		})

		console.log(`✓ Album 1 has ${verifyAlbum1?.photos.length} photo(s)`)
		console.log(`  - Photo mediaId: ${verifyAlbum1?.photos[0]?.mediaId}`)
		console.log(`  - Media filename: ${verifyAlbum1?.photos[0]?.media?.filename}`)
		
		console.log(`✓ Album 2 has ${verifyAlbum2?.photos.length} photo(s)`)
		console.log(`  - Photo mediaId: ${verifyAlbum2?.photos[0]?.mediaId}`)
		console.log(`  - Media filename: ${verifyAlbum2?.photos[0]?.media?.filename}\n`)

		// 6. Check media usage
		console.log('6. Checking media usage records...')
		const mediaUsage = await prisma.mediaUsage.findMany({
			where: { mediaId: media.id }
		})
		console.log(`✓ Media is used in ${mediaUsage.length} places:`)
		mediaUsage.forEach((usage) => {
			console.log(`  - ${usage.contentType} ID ${usage.contentId} (${usage.fieldName})`)
		})

		// 7. Verify media can be queried with all its photos
		console.log('\n7. Querying media with all photos...')
		const mediaWithPhotos = await prisma.media.findUnique({
			where: { id: media.id },
			include: {
				photos: {
					include: {
						album: true
					}
				}
			}
		})
		console.log(`✓ Media is in ${mediaWithPhotos?.photos.length} photos:`)
		mediaWithPhotos?.photos.forEach((photo) => {
			console.log(`  - Photo ID ${photo.id} in album "${photo.album?.title}"`)
		})

		console.log('\n✅ SUCCESS: Media can be shared across multiple albums!')

		// Cleanup
		console.log('\n8. Cleaning up test data...')
		await prisma.mediaUsage.deleteMany({
			where: { mediaId: media.id }
		})
		await prisma.photo.deleteMany({
			where: { mediaId: media.id }
		})
		await prisma.album.deleteMany({
			where: {
				id: {
					in: [album1.id, album2.id]
				}
			}
		})
		await prisma.media.delete({
			where: { id: media.id }
		})
		console.log('✓ Test data cleaned up')

	} catch (error) {
		console.error('\n❌ ERROR:', error)
		process.exit(1)
	} finally {
		await prisma.$disconnect()
	}
}

// Run the test
testMediaSharing()