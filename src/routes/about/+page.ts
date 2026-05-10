import type { PageLoad } from './$types'
import type { Album } from '$lib/types/lastfm'

interface AboutData {
	profile: {
		bio: unknown
		shortBio: string | null
		headline: string | null
		location: string | null
	} | null
	socialLinks: { label: string; url: string }[]
	mentions: {
		title: string
		href: string
		source: string | null
		sourceType: string
		date: string
	}[]
}

export const load: PageLoad = async ({ fetch }) => {
	try {
		const [albums, aboutData] = await Promise.all([
			fetchRecentAlbums(fetch),
			fetchAboutData(fetch)
		])

		return {
			albums,
			aboutProfile: aboutData?.profile || null,
			aboutMentions: aboutData?.mentions || []
		}
	} catch (err) {
		console.error('Error fetching data:', err)
		return {
			albums: [],
			games: [],
			aboutProfile: null,
			aboutMentions: [],
			error: err instanceof Error ? err.message : 'An unknown error occurred'
		}
	}
}

async function fetchRecentAlbums(fetch: typeof window.fetch): Promise<Album[]> {
	const response = await fetch('/api/lastfm')
	if (!response.ok) throw new Error(`Failed to fetch albums: ${response.status}`)
	const musicData: { albums: Album[] } = await response.json()
	return musicData.albums
}

async function fetchAboutData(fetch: typeof window.fetch): Promise<AboutData | null> {
	try {
		const response = await fetch('/api/about')
		if (!response.ok) return null
		return await response.json()
	} catch {
		return null
	}
}
