import type { PageServerLoad } from './$types'
import type { Album } from '$lib/types/lastfm'
import { GARDEN_CATEGORIES } from '$lib/constants/garden'
import { getPublishedGardenItems } from '$lib/server/queries/garden'
import { logger } from '$lib/server/logger'

export const load: PageServerLoad = async ({ fetch, setHeaders }) => {
	setHeaders({ 'cache-control': 'public, max-age=1800, stale-while-revalidate=86400' })

	const [gardenData, albums] = await Promise.all([loadGarden(), loadRecentAlbums(fetch)])

	return { ...gardenData, albums }
}

async function loadGarden() {
	try {
		const items = await getPublishedGardenItems()

		const currentItems = items.filter((item) => item.isCurrent)
		const favoriteItems = items.filter((item) => item.isFavorite)

		const recentItems = [...items]
			.sort((a, b) => {
				const aDate = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
				const bDate = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
				return bDate - aDate
			})
			.slice(0, 5)

		const categoryCounts: Record<string, number> = {}
		for (const item of items) {
			categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1
		}
		const activeCategories = GARDEN_CATEGORIES.filter(
			(c) => (categoryCounts[c.value] || 0) > 0
		).map((c) => ({ ...c, count: categoryCounts[c.value] || 0 }))

		return { currentItems, favoriteItems, recentItems, activeCategories }
	} catch (error) {
		logger.error('Failed to load garden items', error as Error)
		return { currentItems: [], favoriteItems: [], recentItems: [], activeCategories: [] }
	}
}

async function loadRecentAlbums(fetch: typeof globalThis.fetch): Promise<Album[]> {
	try {
		const response = await fetch('/api/lastfm')
		const musicData: { albums: Album[] } = await response.json()
		return musicData.albums
	} catch {
		return []
	}
}
