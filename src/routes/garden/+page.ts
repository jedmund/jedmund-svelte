import type { PageLoad } from './$types'
import type { GardenItem } from '@prisma/client'
import { GARDEN_CATEGORIES } from '$lib/constants/garden'

export const load: PageLoad = async ({ fetch }) => {
	try {
		const res = await fetch('/api/garden')
		const data = await res.json()
		const items: GardenItem[] = data.items ?? []

		const currentItems = items.filter((item) => item.isCurrent)
		const favoriteItems = items.filter((item) => item.isFavorite)

		const recentItems = [...items]
			.sort((a, b) => {
				const aDate = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
				const bDate = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
				return bDate - aDate
			})
			.slice(0, 6)

		const categoryCounts: Record<string, number> = {}
		for (const item of items) {
			categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1
		}
		const activeCategories = GARDEN_CATEGORIES.filter(
			(c) => (categoryCounts[c.value] || 0) > 0
		).map((c) => ({ ...c, count: categoryCounts[c.value] || 0 }))

		return { currentItems, favoriteItems, recentItems, activeCategories }
	} catch {
		return { currentItems: [], favoriteItems: [], recentItems: [], activeCategories: [] }
	}
}
