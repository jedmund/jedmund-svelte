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

interface PaginationInfo {
	total: number
	limit: number
	offset: number
	hasMore: boolean
}

async function fetchProjects(
	fetch: typeof window.fetch
): Promise<{ projects: Project[]; pagination: PaginationInfo | null }> {
	const response = await fetch(
		'/api/projects?projectType=work&includeListOnly=true&includePasswordProtected=true'
	)
	if (!response.ok) {
		throw new Error(`Failed to fetch projects: ${response.status}`)
	}
	return await response.json()
}
