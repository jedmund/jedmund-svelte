import type { PageServerLoad } from './$types'
import { getPaginatedPhotos } from '$lib/server/queries/photos'
import { getOffsetPaginationMeta } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'

const PAGE_SIZE = 20

export const load: PageServerLoad = async ({ setHeaders }) => {
	setHeaders({ 'cache-control': 'public, max-age=1800, stale-while-revalidate=86400' })

	try {
		const { photos, total } = await getPaginatedPhotos({ limit: PAGE_SIZE, offset: 0 })
		return {
			photos,
			pagination: getOffsetPaginationMeta(total, PAGE_SIZE, 0)
		}
	} catch (error) {
		logger.error('Failed to load photos page', error as Error)
		return {
			photos: [],
			pagination: null,
			error: 'Failed to load photos'
		}
	}
}
