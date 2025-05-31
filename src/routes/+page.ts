import type { PageLoad } from './$types'
import type { Album } from '$lib/types/lastfm'
import type { Project } from '$lib/types/project'

export const load: PageLoad = async ({ fetch }) => {
	try {
		// Fetch albums first
		let albums: Album[] = []
		try {
			albums = await fetchRecentAlbums(fetch)
		} catch (albumError) {
			console.error('Error fetching albums:', albumError)
		}

		// Fetch projects
		let projectsData = { projects: [] as Project[], pagination: null }
		try {
			projectsData = await fetchProjects(fetch)
		} catch (projectError) {
			console.error('Error fetching projects:', projectError)
		}

		return {
			albums,
			projects: projectsData.projects || []
		}
	} catch (err) {
		console.error('Error in load function:', err)
		return {
			albums: [],
			projects: []
		}
	}
}

async function fetchRecentAlbums(fetch: typeof window.fetch): Promise<Album[]> {
	const response = await fetch('/api/lastfm')
	if (!response.ok) throw new Error(`Failed to fetch albums: ${response.status}`)
	const musicData: { albums: Album[] } = await response.json()
	return musicData.albums
}

async function fetchRecentSteamGames(fetch: typeof window.fetch): Promise<SerializableGameInfo[]> {
	const response = await fetch('/api/steam')
	if (!response.ok) {
		throw new Error(`Failed to fetch recent game: ${response.status}`)
	}
	return await response.json()
}

async function fetchRecentPSNGames(fetch: typeof window.fetch): Promise<SerializableGameInfo[]> {
	const response = await fetch('/api/psn')
	if (!response.ok) {
		throw new Error(`Failed to fetch recent game: ${response.status}`)
	}
	return await response.json()
}

async function fetchProjects(
	fetch: typeof window.fetch
): Promise<{ projects: Project[]; pagination: any }> {
	const response = await fetch('/api/projects?status=published')
	if (!response.ok) {
		throw new Error(`Failed to fetch projects: ${response.status}`)
	}
	return await response.json()
}
