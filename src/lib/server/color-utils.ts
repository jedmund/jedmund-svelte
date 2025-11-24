/**
 * Color utility functions for selecting better dominant colors
 */

interface ColorInfo {
	hex: string
	percentage: number
}

/**
 * Calculate color vibrance/saturation
 * Returns a value between 0 (grey) and 1 (fully saturated)
 */
function getColorVibrance(hex: string): number {
	// Convert hex to RGB
	const r = parseInt(hex.slice(1, 3), 16) / 255
	const g = parseInt(hex.slice(3, 5), 16) / 255
	const b = parseInt(hex.slice(5, 7), 16) / 255

	const max = Math.max(r, g, b)
	const min = Math.min(r, g, b)

	// Calculate saturation
	const delta = max - min
	const lightness = (max + min) / 2

	if (delta === 0) return 0 // Grey

	const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min)

	return saturation
}

/**
 * Calculate color brightness
 * Returns a value between 0 (black) and 1 (white)
 */
function getColorBrightness(hex: string): number {
	const r = parseInt(hex.slice(1, 3), 16) / 255
	const g = parseInt(hex.slice(3, 5), 16) / 255
	const b = parseInt(hex.slice(5, 7), 16) / 255

	// Using perceived brightness formula
	return r * 0.299 + g * 0.587 + b * 0.114
}

/**
 * Score a color based on its visual interest
 * Higher scores mean more visually interesting colors
 */
function scoreColor(color: ColorInfo, preferBrighter: boolean = false): number {
	const vibrance = getColorVibrance(color.hex)
	const brightness = getColorBrightness(color.hex)

	// Apply brightness penalties with a smoother curve
	let brightnessPenalty = 0
	if (brightness < 0.15) {
		// Heavy penalty for very dark colors (below 15%)
		brightnessPenalty = (0.15 - brightness) * 6
	} else if (brightness < 0.3 && preferBrighter) {
		// Moderate penalty for dark colors (15-30%) when preferBrighter is true
		brightnessPenalty = (0.3 - brightness) * 2
	} else if (brightness > 0.85) {
		// Penalty for very light colors
		brightnessPenalty = (brightness - 0.85) * 2
	}

	// Ideal brightness range is 0.3-0.7 for most use cases
	const idealBrightness = brightness >= 0.3 && brightness <= 0.7

	// Weight factors
	const vibranceWeight = 2.5 // Prefer colorful over grey
	const percentageWeight = 0.4 // Slightly higher weight for prevalence
	const brightnessWeight = 2.0 // Important to avoid too dark/light

	// Calculate base score
	let score =
		vibrance * vibranceWeight +
		(color.percentage / 100) * percentageWeight +
		Math.max(0, 1 - brightnessPenalty) * brightnessWeight

	// Apply bonuses for ideal colors
	if (idealBrightness && vibrance > 0.5) {
		// Bonus for colors in ideal brightness range with good vibrance
		score *= 1.3
	} else if (vibrance > 0.8 && brightness > 0.25 && brightness < 0.75) {
		// Smaller bonus for very vibrant colors that aren't too dark/light
		score *= 1.15
	}

	return score
}

/**
 * Select the best dominant color from Cloudinary's color array
 *
 * @param colors - Array of [hex, percentage] tuples from Cloudinary
 * @param options - Configuration options
 * @returns The selected dominant color hex string
 */
export function selectBestDominantColor(
	colors: Array<[string, number]>,
	options: {
		minPercentage?: number
		preferVibrant?: boolean
		excludeGreys?: boolean
		preferBrighter?: boolean
	} = {}
): string {
	const {
		minPercentage = 2, // Ignore colors below this percentage
		excludeGreys = false,
		preferBrighter = true // Avoid very dark colors
	} = options

	if (!colors || colors.length === 0) {
		return '#888888' // Default grey
	}

	// Convert to our format and filter
	let colorCandidates: ColorInfo[] = colors
		.map(([hex, percentage]) => ({ hex, percentage }))
		.filter((color) => color.percentage >= minPercentage)

	// Exclude greys if requested
	if (excludeGreys) {
		colorCandidates = colorCandidates.filter((color) => {
			const vibrance = getColorVibrance(color.hex)
			return vibrance > 0.1 // Keep colors with at least 10% saturation
		})
	}

	// If no candidates after filtering, use the original dominant color
	if (colorCandidates.length === 0) {
		return colors[0][0]
	}

	// Score and sort colors
	const scoredColors = colorCandidates.map((color) => ({
		...color,
		score: scoreColor(color, preferBrighter)
	}))

	scoredColors.sort((a, b) => b.score - a.score)

	// If we're still getting a darker color than ideal, look for better alternatives
	if (preferBrighter && scoredColors.length > 1) {
		const bestColor = scoredColors[0]
		const bestBrightness = getColorBrightness(bestColor.hex)

		// If the best color is darker than ideal (< 45%), check alternatives
		if (bestBrightness < 0.45) {
			// Look through top candidates for significantly brighter alternatives
			for (let i = 1; i < Math.min(5, scoredColors.length); i++) {
				const candidate = scoredColors[i]
				const candidateBrightness = getColorBrightness(candidate.hex)
				const candidateVibrance = getColorVibrance(candidate.hex)

				// Select a brighter alternative if:
				// 1. It's at least 15% brighter than current best
				// 2. It still has good vibrance (> 0.5)
				// 3. Its score is at least 80% of the best score
				if (
					candidateBrightness > bestBrightness + 0.15 &&
					candidateVibrance > 0.5 &&
					candidate.score >= bestColor.score * 0.8
				) {
					return candidate.hex
				}
			}

			// If still very dark and we can lower the threshold, try again
			if (bestBrightness < 0.25 && minPercentage > 0.5) {
				return selectBestDominantColor(colors, {
					...options,
					minPercentage: Math.max(0.5, minPercentage * 0.5)
				})
			}
		}
	}

	// Return the best scoring color
	return scoredColors[0].hex
}

/**
 * Get a color palette excluding greys and very dark/light colors
 */
export function getVibrantPalette(
	colors: Array<[string, number]>,
	maxColors: number = 5
): string[] {
	const vibrantColors = colors
		.map(([hex, percentage]) => ({ hex, percentage }))
		.filter((color) => {
			const vibrance = getColorVibrance(color.hex)
			const brightness = getColorBrightness(color.hex)
			return vibrance > 0.2 && brightness > 0.15 && brightness < 0.85
		})
		.slice(0, maxColors)
		.map((color) => color.hex)

	return vibrantColors
}

/**
 * Determine if a color is considered "grey" or neutral
 */
export function isGreyColor(hex: string): boolean {
	const vibrance = getColorVibrance(hex)
	return vibrance < 0.1
}

/**
 * Debug function to analyze a color
 */
export function analyzeColor(hex: string): {
	hex: string
	vibrance: number
	brightness: number
	isGrey: boolean
	isDark: boolean
	isBright: boolean
} {
	const vibrance = getColorVibrance(hex)
	const brightness = getColorBrightness(hex)

	return {
		hex,
		vibrance,
		brightness,
		isGrey: vibrance < 0.1,
		isDark: brightness < 0.2,
		isBright: brightness > 0.9
	}
}
