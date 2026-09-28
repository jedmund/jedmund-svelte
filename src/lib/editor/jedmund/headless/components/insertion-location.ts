export function extractCoordinatesFromUrl(url: string): { lat: number; lng: number } | null {
	// Extract from Google Maps URL patterns
	const patterns = [
		/@(-?\d+\.\d+),(-?\d+\.\d+)/, // @lat,lng format
		/ll=(-?\d+\.\d+),(-?\d+\.\d+)/, // ll=lat,lng format
		/q=(-?\d+\.\d+),(-?\d+\.\d+)/ // q=lat,lng format
	]

	for (const pattern of patterns) {
		const match = url.match(pattern)
		if (match) {
			return {
				lat: parseFloat(match[1]),
				lng: parseFloat(match[2])
			}
		}
	}

	return null
}
