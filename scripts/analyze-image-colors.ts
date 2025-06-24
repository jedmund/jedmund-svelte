#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'
import { selectBestDominantColor, isGreyColor, analyzeColor } from '../src/lib/server/color-utils'

const prisma = new PrismaClient()

async function analyzeImage(filename: string) {
	try {
		// Find the image by filename
		const media = await prisma.media.findFirst({
			where: {
				filename: {
					contains: filename
				}
			},
			select: {
				id: true,
				filename: true,
				url: true,
				dominantColor: true,
				colors: true,
				width: true,
				height: true
			}
		})

		if (!media) {
			console.log(`Media not found with filename: ${filename}`)
			return
		}

		console.log('\n=== Image Analysis ===')
		console.log(`Filename: ${media.filename}`)
		console.log(`URL: ${media.url}`)
		console.log(`Current dominant color: ${media.dominantColor}`)
		console.log(`Dimensions: ${media.width}x${media.height}`)

		if (media.colors && Array.isArray(media.colors)) {
			const colors = media.colors as Array<[string, number]>

			console.log('\n=== Color Distribution ===')
			console.log('Top 15 colors:')
			colors.slice(0, 15).forEach(([hex, percentage], index) => {
				const isGrey = isGreyColor(hex)
				console.log(`${index + 1}. ${hex} - ${percentage.toFixed(2)}%${isGrey ? ' (grey)' : ''}`)
			})

			console.log('\n=== Color Analysis Strategies ===')

			// Try different strategies
			const strategies = {
				'Default (min 2%, prefer vibrant & bright)': selectBestDominantColor(colors, {
					minPercentage: 2,
					preferVibrant: true,
					excludeGreys: false,
					preferBrighter: true
				}),

				'Exclude greys, prefer bright': selectBestDominantColor(colors, {
					minPercentage: 1,
					preferVibrant: true,
					excludeGreys: true,
					preferBrighter: true
				}),

				'Very low threshold (0.5%), bright': selectBestDominantColor(colors, {
					minPercentage: 0.5,
					preferVibrant: true,
					excludeGreys: false,
					preferBrighter: true
				}),

				'Allow dark colors': selectBestDominantColor(colors, {
					minPercentage: 1,
					preferVibrant: true,
					excludeGreys: false,
					preferBrighter: false
				}),

				'Focus on prominence (5%)': selectBestDominantColor(colors, {
					minPercentage: 5,
					preferVibrant: false,
					excludeGreys: false,
					preferBrighter: true
				})
			}

			Object.entries(strategies).forEach(([strategy, color]) => {
				const analysis = analyzeColor(color)
				console.log(
					`${strategy}: ${color} | V:${analysis.vibrance.toFixed(2)} B:${analysis.brightness.toFixed(2)}${analysis.isGrey ? ' (grey)' : ''}${analysis.isDark ? ' (dark)' : ''}`
				)
			})

			// Show non-grey colors
			console.log('\n=== Non-Grey Colors ===')
			const nonGreyColors = colors.filter(([hex]) => !isGreyColor(hex))
			console.log(`Found ${nonGreyColors.length} non-grey colors out of ${colors.length} total`)

			if (nonGreyColors.length > 0) {
				console.log('\nTop 10 non-grey colors:')
				nonGreyColors.slice(0, 10).forEach(([hex, percentage], index) => {
					const analysis = analyzeColor(hex)
					console.log(
						`${index + 1}. ${hex} - ${percentage.toFixed(2)}% | B:${analysis.brightness.toFixed(2)}`
					)
				})

				// Look for more vibrant colors deeper in the list
				console.log('\n=== All Colors with >0.5% ===')
				const significantColors = colors.filter(([_, pct]) => pct > 0.5)
				significantColors.forEach(([hex, percentage]) => {
					const isGrey = isGreyColor(hex)
					// Convert hex to RGB to analyze
					const r = parseInt(hex.slice(1, 3), 16)
					const g = parseInt(hex.slice(3, 5), 16)
					const b = parseInt(hex.slice(5, 7), 16)
					const max = Math.max(r, g, b)
					const min = Math.min(r, g, b)
					const saturation = max === 0 ? 0 : ((max - min) / max) * 100

					console.log(
						`${hex} - ${percentage.toFixed(2)}% | Sat: ${saturation.toFixed(0)}%${isGrey ? ' (grey)' : ''}`
					)
				})
			}
		} else {
			console.log('\nNo color data available for this image')
		}
	} catch (error) {
		console.error('Error:', error)
	} finally {
		await prisma.$disconnect()
	}
}

// Get filename from command line argument
const filename = process.argv[2] || 'B0000295.jpg'
analyzeImage(filename)
