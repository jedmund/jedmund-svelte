import type { Album } from './album-types'

export function filterAlbums(albums: Album[], statusFilter: string, sortBy: string) {
	let filtered = [...albums]

	// Apply filter
	if (statusFilter === 'published') {
		filtered = filtered.filter((album) => album.status === 'published')
	} else if (statusFilter === 'draft') {
		filtered = filtered.filter((album) => album.status === 'draft')
	}

	// Apply sorting
	switch (sortBy) {
		case 'oldest':
			filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
			break
		case 'title-asc':
			filtered.sort((a, b) => a.title.localeCompare(b.title))
			break
		case 'title-desc':
			filtered.sort((a, b) => b.title.localeCompare(a.title))
			break
		case 'date-desc':
			filtered.sort((a, b) => {
				if (!a.date && !b.date) return 0
				if (!a.date) return 1
				if (!b.date) return -1
				return new Date(b.date).getTime() - new Date(a.date).getTime()
			})
			break
		case 'date-asc':
			filtered.sort((a, b) => {
				if (!a.date && !b.date) return 0
				if (!a.date) return 1
				if (!b.date) return -1
				return new Date(a.date).getTime() - new Date(b.date).getTime()
			})
			break
		case 'status-published':
			filtered.sort((a, b) => {
				if (a.status === b.status) return 0
				return a.status === 'published' ? -1 : 1
			})
			break
		case 'status-draft':
			filtered.sort((a, b) => {
				if (a.status === b.status) return 0
				return a.status === 'draft' ? -1 : 1
			})
			break
		case 'newest':
		default:
			filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
			break
	}

	return filtered
}
