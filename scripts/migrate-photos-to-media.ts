import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
	console.log('Starting photo to media migration...')

	try {
		// Step 1: Get all photos
		const photos = await prisma.photo.findMany({
			include: {
				album: true,
				media: true
			}
		})

		console.log(`Found ${photos.length} photos to migrate`)

		// Step 2: Process each photo
		let migratedCount = 0
		let createdMediaCount = 0
		let albumMediaCount = 0

		for (const photo of photos) {
			if (photo.mediaId && photo.media) {
				// Photo has associated media - update the media record
				await prisma.media.update({
					where: { id: photo.mediaId },
					data: {
						photoCaption: photo.caption,
						photoTitle: photo.title,
						photoDescription: photo.description,
						photoSlug: photo.slug,
						photoPublishedAt: photo.publishedAt,
						isPhotography: photo.showInPhotos
					}
				})
				migratedCount++
			} else {
				// Photo has no media - create new media record
				const newMedia = await prisma.media.create({
					data: {
						filename: photo.filename,
						originalName: photo.filename,
						mimeType: 'image/jpeg', // Default, could be improved
						size: 0, // Unknown
						url: photo.url,
						thumbnailUrl: photo.thumbnailUrl,
						width: photo.width,
						height: photo.height,
						exifData: photo.exifData,
						isPhotography: photo.showInPhotos,
						photoCaption: photo.caption,
						photoTitle: photo.title,
						photoDescription: photo.description,
						photoSlug: photo.slug,
						photoPublishedAt: photo.publishedAt,
						createdAt: photo.createdAt
					}
				})
				createdMediaCount++

				// Update the photo to reference the new media
				await prisma.photo.update({
					where: { id: photo.id },
					data: { mediaId: newMedia.id }
				})
			}

			// Create AlbumMedia record if photo belongs to an album
			if (photo.albumId) {
				const mediaId =
					photo.mediaId ||
					(
						await prisma.photo.findUnique({
							where: { id: photo.id },
							select: { mediaId: true }
						})
					)?.mediaId

				if (mediaId) {
					// Check if AlbumMedia already exists
					const existing = await prisma.albumMedia.findUnique({
						where: {
							albumId_mediaId: {
								albumId: photo.albumId,
								mediaId: mediaId
							}
						}
					})

					if (!existing) {
						await prisma.albumMedia.create({
							data: {
								albumId: photo.albumId,
								mediaId: mediaId,
								displayOrder: photo.displayOrder,
								createdAt: photo.createdAt
							}
						})
						albumMediaCount++
					}
				}
			}
		}

		console.log(`Migration completed:`)
		console.log(`- Updated ${migratedCount} existing media records`)
		console.log(`- Created ${createdMediaCount} new media records`)
		console.log(`- Created ${albumMediaCount} album-media relationships`)

		// Step 3: Verify migration
		const mediaWithPhotoData = await prisma.media.count({
			where: {
				OR: [
					{ photoCaption: { not: null } },
					{ photoTitle: { not: null } },
					{ photoSlug: { not: null } }
				]
			}
		})

		const albumMediaRelations = await prisma.albumMedia.count()

		console.log(`\nVerification:`)
		console.log(`- Media records with photo data: ${mediaWithPhotoData}`)
		console.log(`- Album-media relationships: ${albumMediaRelations}`)
	} catch (error) {
		console.error('Migration failed:', error)
		process.exit(1)
	} finally {
		await prisma.$disconnect()
	}
}

main()
