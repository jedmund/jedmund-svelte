// Helper function to detect if a string contains Japanese characters
export function containsJapanese(str: string): boolean {
	// Check for Hiragana, Katakana, and Kanji
	return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(str)
}

// Helper function to check if albums match
export const albumsMatch = (albumName: string, searchTerm: string, exact = false): boolean => {
	if (exact) {
		return albumName === searchTerm
	}
	const albumLower = albumName.toLowerCase()
	const searchLower = searchTerm.toLowerCase()
	return (
		albumLower === searchLower ||
		albumLower.startsWith(searchLower) ||
		albumLower.includes(searchLower)
	)
}

// Helper function to check if artists match
export const artistsMatch = (artistName: string, searchArtist: string, exact = false): boolean => {
	if (exact) {
		return artistName === searchArtist
	}
	const artistLower = artistName.toLowerCase()
	const searchLower = searchArtist.toLowerCase()

	// Direct match
	if (artistLower === searchLower) return true

	// Handle comma-separated artists
	if (searchArtist.includes(',')) {
		const primaryArtist = searchArtist.split(',')[0].trim().toLowerCase()
		if (artistLower === primaryArtist || artistLower.includes(primaryArtist)) return true
	}

	// Reverse check - if the found artist is in our search
	return searchLower.includes(artistLower)
}

// Try different matching strategies in order of preference
