import type { PageServerLoad } from './$types'
import { getPublishedAlbums, toAlbumListItem } from '$lib/server/queries/albums'
import { getOffsetPaginationMeta } from '$lib/server/api-utils'
import { logger } from '$lib/server/logger'

const PAGE_SIZE = 20

export const load: PageServerLoad = async ({ setHeaders }) => {
	setHeaders({ 'cache-control': 'public, max-age=1800, stale-while-revalidate=86400' })

	try {
		const { albums, total } = await getPublishedAlbums({ limit: PAGE_SIZE, offset: 0 })
		return {
			albums: albums.map((album) => toAlbumListItem(album, { isAdmin: false })),
			pagination: getOffsetPaginationMeta(total, PAGE_SIZE, 0)
		}
	} catch (error) {
		logger.error('Failed to load albums page', error as Error)
		return {
			albums: [],
			pagination: { total: 0, limit: PAGE_SIZE, offset: 0, hasMore: false },
			error: 'Failed to load albums'
		}
	}
}
