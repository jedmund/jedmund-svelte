import type { LayoutServerLoad } from './$types'
import { getPaginatedPhotos } from '$lib/server/queries/photos'
import { logger } from '$lib/server/logger'

const FILMSTRIP_LIMIT = 100

export const load: LayoutServerLoad = async ({ setHeaders }) => {
	setHeaders({ 'cache-control': 'public, max-age=1800, stale-while-revalidate=86400' })

	try {
		const { photos, total } = await getPaginatedPhotos({ limit: FILMSTRIP_LIMIT, offset: 0 })
		return { photoItems: photos, photoItemsTotal: total }
	} catch (error) {
		logger.error('Failed to load photos', error as Error)
		return { photoItems: [], photoItemsTotal: 0, error: 'Failed to load photos' }
	}
}
