import type { Prisma } from '@prisma/client'
import { prisma } from '$lib/server/database'

export interface GardenFilters {
	category?: string
	current?: boolean
	favorites?: boolean
}

export async function getPublishedGardenItems(filters: GardenFilters = {}) {
	const where: Prisma.GardenItemWhereInput = { status: 'published' }
	if (filters.category) where.category = filters.category
	if (filters.current) where.isCurrent = true
	if (filters.favorites) where.isFavorite = true

	return prisma.gardenItem.findMany({
		where,
		orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }]
	})
}
