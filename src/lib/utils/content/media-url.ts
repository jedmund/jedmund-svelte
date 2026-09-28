// Helper function to extract media ID from Cloudinary URL
export function extractMediaIdFromUrl(url: string): string | null {
	if (!url) return null

	// Match Cloudinary URLs with media ID pattern
	// Example: https://res.cloudinary.com/jedmund/image/upload/v1234567890/media/123.jpg
	const cloudinaryMatch = url.match(/\/media\/(\d+)(?:\.|$)/)
	if (cloudinaryMatch) {
		return cloudinaryMatch[1]
	}

	// Fallback: try to extract numeric ID from filename
	const filenameMatch = url.match(/\/(\d+)\.[^/]*$/)
	if (filenameMatch) {
		return filenameMatch[1]
	}

	return null
}
