#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkPhotoColors() {
	try {
		// Count total photography media
		const totalPhotos = await prisma.media.count({
			where: { isPhotography: true }
		})

		// Count photos with dominant color
		const photosWithColor = await prisma.media.count({
			where: {
				isPhotography: true,
				dominantColor: { not: null }
			}
		})

		// Count photos without dominant color
		const photosWithoutColor = await prisma.media.count({
			where: {
				isPhotography: true,
				dominantColor: null
			}
		})

		// Get some examples
		const examples = await prisma.media.findMany({
			where: {
				isPhotography: true,
				dominantColor: { not: null }
			},
			select: {
				filename: true,
				dominantColor: true,
				thumbnailUrl: true
			},
			take: 5
		})

		console.log('=== Photography Color Analysis ===')
		console.log(`Total photography items: ${totalPhotos}`)
		console.log(
			`With dominant color: ${photosWithColor} (${((photosWithColor / totalPhotos) * 100).toFixed(1)}%)`
		)
		console.log(
			`Without dominant color: ${photosWithoutColor} (${((photosWithoutColor / totalPhotos) * 100).toFixed(1)}%)`
		)

		if (examples.length > 0) {
			console.log('\n=== Examples with dominant colors ===')
			examples.forEach((media) => {
				console.log(`${media.filename}: ${media.dominantColor}`)
			})
		}
	} catch (error) {
		console.error('Error:', error)
	} finally {
		await prisma.$disconnect()
	}
}

checkPhotoColors()
