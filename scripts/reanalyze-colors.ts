#!/usr/bin/env tsx

/**
 * Script to reanalyze colors for specific images or all images
 * Usage: tsx scripts/reanalyze-colors.ts [options]
 *
 * Options:
 *   --id <mediaId>     Reanalyze specific media ID
 *   --grey-only        Only reanalyze images with grey dominant colors
 *   --all              Reanalyze all images with color data
 *   --dry-run          Show what would be changed without updating
 */

import { PrismaClient } from '@prisma/client'
import { selectBestDominantColor, isGreyColor } from '../src/lib/server/color-utils'

const prisma = new PrismaClient()

interface Options {
	id?: number
	greyOnly: boolean
	all: boolean
	dryRun: boolean
}

function parseArgs(): Options {
	const args = process.argv.slice(2)
	const options: Options = {
		greyOnly: false,
		all: false,
		dryRun: false
	}

	for (let i = 0; i < args.length; i++) {
		switch (args[i]) {
			case '--id':
				options.id = parseInt(args[++i])
				break
			case '--grey-only':
				options.greyOnly = true
				break
			case '--all':
				options.all = true
				break
			case '--dry-run':
				options.dryRun = true
				break
		}
	}

	return options
}

async function reanalyzeColors(options: Options) {
	try {
		// Build query
		const where: any = {
			colors: { not: null }
		}

		if (options.id) {
			where.id = options.id
		} else if (options.greyOnly) {
			// We'll filter in code since Prisma doesn't support function calls in where
		}

		// Get media items
		const mediaItems = await prisma.media.findMany({
			where,
			select: {
				id: true,
				filename: true,
				dominantColor: true,
				colors: true
			}
		})

		console.log(`Found ${mediaItems.length} media items with color data`)

		let updated = 0
		let skipped = 0

		for (const media of mediaItems) {
			if (!media.colors || !Array.isArray(media.colors)) {
				skipped++
				continue
			}

			const currentColor = media.dominantColor
			const colors = media.colors as Array<[string, number]>

			// Skip if grey-only filter and current color isn't grey
			if (options.greyOnly && currentColor && !isGreyColor(currentColor)) {
				skipped++
				continue
			}

			// Calculate new dominant color
			const newColor = selectBestDominantColor(colors, {
				minPercentage: 2,
				preferVibrant: true,
				excludeGreys: false
			})

			if (newColor !== currentColor) {
				console.log(`\n${media.filename}:`)
				console.log(`  Current: ${currentColor || 'none'}`)
				console.log(`  New:     ${newColor}`)

				// Show color breakdown
				const topColors = colors.slice(0, 5)
				console.log('  Top colors:')
				topColors.forEach(([hex, percentage]) => {
					const isGrey = isGreyColor(hex)
					console.log(`    ${hex} - ${percentage.toFixed(1)}%${isGrey ? ' (grey)' : ''}`)
				})

				if (!options.dryRun) {
					// Update media
					await prisma.media.update({
						where: { id: media.id },
						data: { dominantColor: newColor }
					})

					// Update related photos
					await prisma.photo.updateMany({
						where: { mediaId: media.id },
						data: { dominantColor: newColor }
					})

					updated++
				}
			} else {
				skipped++
			}
		}

		console.log(`\n✓ Complete!`)
		console.log(`  Updated: ${updated}`)
		console.log(`  Skipped: ${skipped}`)
		if (options.dryRun) {
			console.log(`  (Dry run - no changes made)`)
		}
	} catch (error) {
		console.error('Error:', error)
		process.exit(1)
	} finally {
		await prisma.$disconnect()
	}
}

// Run the script
const options = parseArgs()

if (!options.id && !options.all && !options.greyOnly) {
	console.log('Usage: tsx scripts/reanalyze-colors.ts [options]')
	console.log('')
	console.log('Options:')
	console.log('  --id <mediaId>     Reanalyze specific media ID')
	console.log('  --grey-only        Only reanalyze images with grey dominant colors')
	console.log('  --all              Reanalyze all images with color data')
	console.log('  --dry-run          Show what would be changed without updating')
	process.exit(1)
}

reanalyzeColors(options)
